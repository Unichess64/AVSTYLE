// tests/dominio/conflitti.test.ts
//
// La frase di spec §10.1: si costruisce dall'appuntamento CHE POSSIEDE la
// cella, non dalla cella, ed esclude TUTTI gli appuntamenti in scrittura —
// nuovi, modificati e tolti — esattamente come `excludeAppointmentIds` in §7.4.
import { describe, expect, it } from 'vitest'
import type { AppuntamentoLetto } from '../../src/dominio/blocchi'
import { fraseDeiConflitti, idInScrittura, trovaConflitti } from '../../src/dominio/conflitti'

const VERA = 'op-vera'
const ANNALISA = 'op-annalisa'
const NOMI = new Map([[VERA, 'Vera'], [ANNALISA, 'Annalisa']])

function letto(id: string, operatriceId: string, inizio: number, durata: number, clienteNome = 'Maria Rossi'): AppuntamentoLetto {
  return {
    id, visitaId: `vi-${id}`, operatriceId, servizioId: 'sv', servizioNome: 'Refill gel',
    clienteId: `cl-${clienteNome}`, clienteNome, inizio, durata, pausa: 2,
  }
}

const voluto = (id: string, operatriceId: string, inizio: number, durata: number) => ({ id, operatriceId, inizio, durata })

describe('trovaConflitti (spec §10.1)', () => {
  it('la frase nomina l appuntamento CHE POSSIEDE la cella, non la cella', () => {
    // Annalisa 14:00–15:00, una prenotazione alle 14:30: la prima cella in
    // comune è alle 14:30, un'ora a cui non comincia niente.
    const giorno = [letto('x', ANNALISA, 168, 12)]
    const c = trovaConflitti([voluto('n', ANNALISA, 174, 6)], giorno, [], NOMI)
    expect(c).toEqual([{ appuntamentoId: 'x', frase: 'Annalisa ha un appuntamento alle 14:00 con Maria Rossi' }])
  })

  it('due appuntamenti in conflitto si nominano entrambi', () => {
    // Una violazione di unicità ne riporta una sola: la frase si rifà dal
    // controllo preventivo, che li trova tutti.
    const giorno = [letto('x', VERA, 120, 6), letto('y', VERA, 126, 6, 'Lucia Ciccarè'), letto('z', ANNALISA, 120, 12)]
    const c = trovaConflitti([voluto('n', VERA, 118, 12)], giorno, [], NOMI)
    expect(c.map((k) => k.appuntamentoId)).toEqual(['x', 'y'])
    expect(fraseDeiConflitti(c)).toEqual({
      frase: 'Vera ha un appuntamento alle 10:00 con Maria Rossi; Vera ha un appuntamento alle 10:30 con Lucia Ciccarè',
      vaiA: 'x',
    })
  })

  it('la pausa non è occupazione: comincia dove finisce l altro e non è un conflitto', () => {
    const giorno = [letto('x', VERA, 120, 6)]
    expect(trovaConflitti([voluto('n', VERA, 126, 6)], giorno, [], NOMI)).toEqual([])
    expect(trovaConflitti([voluto('n', VERA, 114, 6)], giorno, [], NOMI)).toEqual([])
  })

  it('uno spostamento dentro la propria durata non nomina sé stesso', () => {
    // Da 10:00 a 10:30 un appuntamento di un'ora trova le proprie celle
    // ancora al loro posto: senza l'esclusione si nominerebbe da solo.
    const giorno = [letto('x', VERA, 120, 12)]
    const voluti = [voluto('x', VERA, 126, 12)]
    expect(trovaConflitti(voluti, giorno, idInScrittura(voluti, ['x']), NOMI)).toEqual([])
  })

  it('un appuntamento tolto e rimesso allo stesso orario non dà conflitto con sé stesso', () => {
    // §4.3 passo 3: l'esclusione copre i nuovi, i modificati E i tolti. Qui
    // `x` è tolto dalla scheda e un servizio nuovo prende il suo posto.
    const giorno = [letto('x', VERA, 120, 12)]
    const voluti = [voluto('nuovo', VERA, 120, 12)]
    expect(trovaConflitti(voluti, giorno, idInScrittura(voluti, ['x']), NOMI)).toEqual([])
  })

  it('idInScrittura è l unione di quelli nella scheda e di quelli che la visita aveva', () => {
    expect(idInScrittura([voluto('a', VERA, 0, 1), voluto('n', VERA, 0, 1)], ['a', 't']).sort()).toEqual(['a', 'n', 't'])
  })

  it('due servizi della scheda sulla stessa operatrice che si sovrappongono sono un conflitto', () => {
    // il vincolo di occupazione li rifiuterebbe comunque: meglio dirlo prima
    const c = trovaConflitti([voluto('a', VERA, 120, 12), voluto('b', VERA, 126, 6)], [], [], NOMI)
    // Il bersaglio di «vai lì» è nell'agenda: un servizio della scheda non ci
    // sta, e cercarlo chiudeva la scheda buttando la bozza (revisione, C2).
    expect(c).toEqual([{ appuntamentoId: null, frase: 'Vera ha già un servizio alle 10:00 in questa visita' }])
    expect(fraseDeiConflitti(c)).toEqual({ frase: 'Vera ha già un servizio alle 10:00 in questa visita', vaiA: null })
  })

  it('con un conflitto interno e uno nell agenda, «vai lì» porta a quello nell agenda', () => {
    const c = trovaConflitti([voluto('a', VERA, 110, 12), voluto('b', VERA, 112, 6)], [letto('x', VERA, 120, 6)], [], NOMI)
    expect(fraseDeiConflitti(c)?.vaiA).toBe('x')
  })
})

describe('fraseDeiConflitti', () => {
  it('la frase porta il bersaglio del pulsante «vai lì»', () => {
    const c = trovaConflitti([voluto('n', ANNALISA, 174, 6)], [letto('x', ANNALISA, 168, 12)], [], NOMI)
    expect(fraseDeiConflitti(c)).toEqual({ frase: 'Annalisa ha un appuntamento alle 14:00 con Maria Rossi', vaiA: 'x' })
  })

  it('nessun conflitto, nessuna frase', () => {
    expect(fraseDeiConflitti([])).toBeNull()
  })
})
