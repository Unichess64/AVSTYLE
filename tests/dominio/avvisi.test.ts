// tests/dominio/avvisi.test.ts
//
// Gli avvisi che non bloccano (spec 3a §4.5): fuori orario (D18, spec §8.4),
// cliente già prenotata lo stesso giorno (D25, spec §8.5), la stessa cliente in
// due servizi sovrapposti della stessa visita. Ognuno ha una CHIAVE, e
// «Salva comunque» conferma le chiavi mostrate: un avviso con una chiave non
// confermata ferma il salvataggio (D3-19).
import { describe, expect, it } from 'vitest'
import { type IngressoAvvisi, calcolaAvvisi, confermaAvvisi, fermaIlSalvataggio } from '../../src/dominio/avvisi'
import type { AppuntamentoLetto } from '../../src/dominio/blocchi'
import type { ServizioInScheda } from '../../src/dominio/scheda'

const VERA = 'op-vera'
const ALESSANDRA = 'op-alessandra'
const MARIA = 'cl-maria'
const DATA = '2026-10-08'

function servizio(id: string, operatriceId: string, inizio: number, durata: number): ServizioInScheda {
  return { id, nuovo: true, operatriceId, servizioId: 'sv-refill', inizio, durata, durataAMano: false, segueIlPrecedente: false }
}

function letto(id: string, visitaId: string, operatriceId: string, inizio: number, clienteId = MARIA): AppuntamentoLetto {
  return {
    id, visitaId, operatriceId, servizioId: 'sv-massaggio', servizioNome: 'Massaggio',
    clienteId, clienteNome: clienteId === MARIA ? 'Maria Rossi' : 'Lucia Ciccarè',
    inizio, durata: 10, pausa: 3,
  }
}

// Vera lavora 09:00–13:00 e 14:00–19:00; Alessandra 09:00–19:00. Due fasce
// per Vera: «dentro una fascia» non è «fra la prima apertura e l'ultima
// chiusura».
function ingresso(servizi: ServizioInScheda[], altro: Partial<IngressoAvvisi> = {}): IngressoAvvisi {
  return {
    visitaId: 'vi-questa',
    data: DATA,
    cliente: { id: MARIA, nome: 'Maria Rossi' },
    servizi,
    giorno: {
      risolti: new Map([
        [VERA, { dayStatus: 'open' as const, ranges: [{ startBoundary: 108, endBoundary: 156 }, { startBoundary: 168, endBoundary: 228 }] }],
        [ALESSANDRA, { dayStatus: 'open' as const, ranges: [{ startBoundary: 108, endBoundary: 228 }] }],
      ]),
      appuntamenti: [],
    },
    nomiOperatrici: new Map([[VERA, 'Vera'], [ALESSANDRA, 'Alessandra']]),
    nomiServizi: new Map([['sv-refill', 'Refill gel'], ['sv-massaggio', 'Massaggio']]),
    ...altro,
  }
}

const chiavi = (i: IngressoAvvisi) => calcolaAvvisi(i).map((a) => a.chiave)

describe('le tre chiavi', () => {
  it('fuori orario: uno per appuntamento, anche nella pausa fra due fasce', () => {
    const avvisi = calcolaAvvisi(
      ingresso([servizio('a', VERA, 120, 6), servizio('b', VERA, 156, 6), servizio('c', VERA, 225, 6)]),
    )
    expect(avvisi.map((a) => a.chiave)).toEqual(['fuori-orario:b', 'fuori-orario:c'])
    expect(avvisi[0].motivo).toBe('Refill gel alle 13:00 è fuori dall’orario di Vera')
  })

  it('fuori orario dice perché: salone chiuso, operatrice assente', () => {
    const chiuso = ingresso([servizio('a', VERA, 120, 6)], {
      giorno: { risolti: new Map([[VERA, { dayStatus: 'salon_closed' as const, ranges: [] }]]), appuntamenti: [] },
    })
    expect(calcolaAvvisi(chiuso)[0].motivo).toBe('Refill gel alle 10:00: quel giorno il salone è chiuso')
    const assente = ingresso([servizio('a', VERA, 120, 6)], {
      giorno: { risolti: new Map([[VERA, { dayStatus: 'operator_off' as const, ranges: [] }]]), appuntamenti: [] },
    })
    expect(calcolaAvvisi(assente)[0].motivo).toBe('Refill gel alle 10:00: quel giorno Vera non lavora')
  })

  it('la chiave contiene l appuntamento, non solo il tipo', () => {
    // Altrimenti confermare un fuori orario li confermerebbe tutti.
    const i = ingresso([servizio('a', VERA, 156, 6), servizio('b', VERA, 228, 6)])
    expect(chiavi(i)).toEqual(['fuori-orario:a', 'fuori-orario:b'])
    const soloA = confermaAvvisi(new Set(), calcolaAvvisi(ingresso([servizio('a', VERA, 156, 6)])))
    expect(fermaIlSalvataggio(calcolaAvvisi(i), soloA)).toBe(true)
  })

  it('cliente già prenotata lo stesso giorno, in un altra visita, con il nome e l ora', () => {
    const i = ingresso([servizio('a', VERA, 120, 6)], {
      giorno: {
        risolti: ingresso([]).giorno.risolti,
        appuntamenti: [letto('x', 'vi-altra', ALESSANDRA, 168), letto('y', 'vi-lucia', VERA, 180, 'cl-lucia')],
      },
    })
    const avvisi = calcolaAvvisi(i)
    expect(avvisi).toEqual([
      { chiave: `gia-prenotata:${MARIA}:${DATA}`, motivo: 'Maria Rossi è già prenotata alle 14:00 con Alessandra' },
    ])
  })

  it('gli appuntamenti della visita stessa non contano come «già prenotata»', () => {
    const i = ingresso([servizio('a', VERA, 120, 6)], {
      giorno: { risolti: ingresso([]).giorno.risolti, appuntamenti: [letto('a', 'vi-questa', VERA, 120), letto('t', 'vi-questa', VERA, 140)] },
    })
    expect(chiavi(i)).toEqual([])
  })

  it('la stessa cliente in due servizi sovrapposti della STESSA visita dà l avviso', () => {
    const i = ingresso([servizio('b', VERA, 120, 12), servizio('a', ALESSANDRA, 126, 10)])
    expect(calcolaAvvisi(i)).toEqual([
      { chiave: 'sovrapposta:a:b', motivo: 'Maria Rossi avrebbe Refill gel e Refill gel insieme alle 10:30' },
    ])
  })

  it('la stessa cliente in due servizi NON sovrapposti della stessa visita non dà nessun avviso', () => {
    // contigui, cioè il secondo comincia dove il primo finisce: la fine è esclusa
    expect(chiavi(ingresso([servizio('a', VERA, 120, 12), servizio('b', ALESSANDRA, 132, 10)]))).toEqual([])
  })

  it('senza cliente scelta non c è «già prenotata» né «sovrapposta», ma il fuori orario sì', () => {
    const i = ingresso([servizio('a', VERA, 156, 12), servizio('b', ALESSANDRA, 160, 10)], {
      cliente: null,
      giorno: { risolti: ingresso([]).giorno.risolti, appuntamenti: [letto('x', 'vi-altra', ALESSANDRA, 168)] },
    })
    expect(chiavi(i)).toEqual(['fuori-orario:a'])
  })
})

describe('le chiavi confermate (D3-19)', () => {
  const avvisi = calcolaAvvisi(ingresso([servizio('a', VERA, 156, 6)]))

  it('un avviso con chiave non confermata ferma il salvataggio', () => {
    expect(avvisi).toHaveLength(1)
    expect(fermaIlSalvataggio(avvisi, new Set())).toBe(true)
  })

  it('gli avvisi confermati non fermano il salvataggio', () => {
    expect(fermaIlSalvataggio(avvisi, confermaAvvisi(new Set(), avvisi))).toBe(false)
  })

  it('un avviso NUOVO, con una chiave mai confermata, ferma un salvataggio già confermato una volta', () => {
    const confermati = confermaAvvisi(new Set(), avvisi)
    const dopo = calcolaAvvisi(ingresso([servizio('a', VERA, 156, 6), servizio('b', VERA, 230, 6)]))
    expect(fermaIlSalvataggio(dopo, confermati)).toBe(true)
    expect(fermaIlSalvataggio(dopo, confermaAvvisi(confermati, dopo))).toBe(false)
  })

  it('confermaAvvisi non modifica l insieme che riceve', () => {
    const prima = new Set(['x'])
    const dopo = confermaAvvisi(prima, avvisi)
    expect([...prima]).toEqual(['x'])
    expect([...dopo].sort()).toEqual(['fuori-orario:a', 'x'])
  })
})
