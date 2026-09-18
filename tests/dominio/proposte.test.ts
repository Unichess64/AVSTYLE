import { describe, expect, it } from 'vitest'
import { proposeStarts } from '../../src/dominio/proposte'
import type { IngressoProposta } from '../../src/dominio/proposte'

const GIORNATA = { startBoundary: 108, endBoundary: 228 } // 09:00–19:00

function ingresso(sopra: Partial<IngressoProposta> = {}): IngressoProposta {
  return {
    date: '2026-03-12',
    ranges: [GIORNATA],
    occupancy: [],
    durations: [18],
    buffers: [0],
    nowCell: null,
    excludeAppointmentIds: [],
    dayStatus: 'open',
    ...sopra,
  }
}

describe('proposeStarts — i quattro motivi', () => {
  // ⚠ discriminante: spec §7.4 dice che la distinzione fra «salone chiuso» e
  // «l operatrice non lavora quel giorno» NON si recupera dalle fasce, perché
  // §7.1 le ha già ridotte entrambe alla stessa lista vuota. Le due prove qui
  // hanno fasce identiche e devono dare motivi diversi.
  it('dice salone chiuso quando lo stato lo dice', () => {
    const esito = proposeStarts(ingresso({ ranges: [], dayStatus: 'salon_closed' }))
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('salon_closed')
  })

  it('dice operatrice assente quando lo stato lo dice', () => {
    const esito = proposeStarts(ingresso({ ranges: [], dayStatus: 'operator_off' }))
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('operator_off')
  })

  // ⚠ discriminante: lo stato batte le fasce. Qui il salone è chiuso ma le
  // fasce sono piene: se la funzione guardasse le fasce invece dello stato,
  // proporrebbe orari dentro un salone chiuso.
  it('non propone niente in un giorno chiuso, anche con le fasce piene', () => {
    const esito = proposeStarts(ingresso({ ranges: [GIORNATA], dayStatus: 'salon_closed' }))
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('salon_closed')
  })

  // ⚠ discriminante: D2-5. Fasce vuote con stato aperto è un ingresso
  // incoerente, e la risposta è operatrice assente — non un motivo che
  // accuserebbe il servizio di essere troppo lungo.
  it('tratta fasce vuote come operatrice assente anche se lo stato dice aperto', () => {
    const esito = proposeStarts(ingresso({ ranges: [], dayStatus: 'open' }))
    expect(esito.reason).toBe('operator_off')
  })

  // ⚠ discriminante: il servizio più lungo di QUALUNQUE fascia è un motivo
  // diverso da «pieno», perché al telefono è una frase diversa: estendere
  // l orizzonte non servirà mai. La giornata qui è spezzata in due tronconi da
  // 36 celle e il servizio ne chiede 37.
  it('dice che il servizio è più lungo di qualunque fascia', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 108, endBoundary: 144 },
          { startBoundary: 180, endBoundary: 216 },
        ],
        durations: [37],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('service_too_long')
  })

  it('non dice troppo lungo quando il servizio sta esattamente nella fascia', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 144 }], durations: [36], buffers: [0] }),
    )
    expect(esito.reason).not.toBe('service_too_long')
  })

  // ⚠ discriminante: «più lungo di QUALUNQUE fascia» vuol dire confrontarsi
  // con la PIÙ LUNGA, non con la prima. Qui il pomeriggio è più lungo della
  // mattina e il servizio sta solo lì: guardando `ranges[0]` la funzione
  // direbbe «troppo lungo» su un servizio che ci sta. Senza fasce di lunghezza
  // DIVERSA questa differenza non è osservabile, e ogni altra prova del piano
  // usa fasce lunghe uguali.
  it('confronta il servizio con la fascia più lunga, non con la prima', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 108, endBoundary: 120 }, // 12 celle
          { startBoundary: 150, endBoundary: 198 }, // 48 celle
        ],
        durations: [24],
        buffers: [0],
      }),
    )
    expect(esito.reason).not.toBe('service_too_long')
  })

  it('rifiuta durate e pause di lunghezza diversa', () => {
    expect(() => proposeStarts(ingresso({ durations: [18, 10], buffers: [0] }))).toThrow(RangeError)
    expect(() => proposeStarts(ingresso({ durations: [], buffers: [] }))).toThrow(RangeError)
  })
})

import { blocco } from '../../src/dominio/tempo'

describe('proposeStarts — le partenze dentro una fascia', () => {
  it('propone ogni cella da cui il servizio ci sta, e nessuna oltre', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 114 }], durations: [4], buffers: [0] }),
    )
    expect(esito.starts).toEqual([108, 109, 110])
    expect(esito.reason).toBeNull()
  })

  // ⚠ discriminante: D2-2. Con proposte valide non esiste alcun motivo.
  it('non dà alcun motivo quando ci sono proposte', () => {
    expect(proposeStarts(ingresso()).reason).toBeNull()
  })

  // ⚠ discriminante: è la regola di §5 sul confine di FINE, esclusa.
  // Una fascia [108, 114) accoglie un servizio da 6 celle che parte alla 108 e
  // finisce alla 113 inclusa; da 109 non ci starebbe.
  it('accetta il servizio che finisce esattamente sull ultimo confine', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 114 }], durations: [6], buffers: [0] }),
    )
    expect(esito.starts).toEqual([108])
  })

  it('non propone partenze a cavallo di due fasce separate', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 108, endBoundary: 114 },
          { startBoundary: 120, endBoundary: 126 },
        ],
        durations: [4],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([108, 109, 110, 120, 121, 122])
  })

  // ⚠ discriminante: è l'esempio misurato di §7.2, che chiude il cerchio con
  // la piega del Task 4. Un massaggio da 10 celle nella mattina PIEGATA
  // [108, 180) può partire dalla 135 alla 143 — 11:15–11:55 — che sono
  // esattamente le partenze che due fasce non piegate rifiuterebbero.
  it('propone le partenze da 11:15 a 11:55 su una mattina piegata', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 180 }], durations: [10], buffers: [0] }),
    )
    expect(esito.starts).toContain(135)
    expect(esito.starts).toContain(143)
    expect(esito.starts).toContain(140)
  })

  // ⚠ discriminante: l'ULTIMA cella del blocco è occupata (D2-1). Un blocco
  // 120–137 lascia libera la 138: se endCell fosse esclusivo, la 137 sarebbe
  // proposta e questa prova la vedrebbe.
  it('non propone una partenza sopra un appuntamento esistente', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('a1', 120, 18, 0)],
        durations: [1],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(119)
    expect(esito.starts).not.toContain(120)
    expect(esito.starts).not.toContain(137)
    expect(esito.starts).toContain(138)
  })

  it('non propone una partenza che attraverserebbe un appuntamento più avanti', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('a1', 120, 18, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(114)
    expect(esito.starts).not.toContain(115)
    expect(esito.starts).toContain(138)
  })

  it('dice pieno quando l occupazione non lascia alcuna partenza', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 126 }],
        occupancy: [blocco('a1', 108, 18, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('full')
  })

  it('restituisce le partenze in ordine crescente anche con le fasce disordinate', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 120, endBoundary: 126 },
          { startBoundary: 108, endBoundary: 114 },
        ],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([108, 120])
  })
})

describe('proposeStarts — il tempo di riassetto è simmetrico', () => {
  // ⚠ discriminante: la metà che la revisione 2 della spec aveva perso. Un
  // massaggio di Alessandra finisce alle 11:00 — celle 122–131, con l ultima
  // alla 131 — e porta una pausa di 3 celle (15 minuti). Una ceretta proposta
  // alle 11:00 (cella 132) le starebbe attaccata. La prima partenza legittima
  // è la 135, cioè le 11:15. NIENTE SEGUE: la revisione 2 applicava la regola
  // solo quando c era un appuntamento dopo, e qui sarebbe verde a torto.
  it('onora la pausa dell appuntamento PRECEDENTE anche quando non segue niente', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('massaggio', 122, 10, 3)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).not.toContain(132)
    expect(esito.starts).not.toContain(134)
    expect(esito.starts).toContain(135)
  })

  // ⚠ discriminante: la metà che la revisione 3 della spec aveva perso. Qui
  // NIENTE PRECEDE: una ceretta con pausa propria di 3 celle viene proposta
  // alle 11:00 e una manicure è già prenotata alle 11:30 (cella 138). La
  // ceretta da 6 celle occuperebbe 132–137 e non lascerebbe riassetto. La
  // partenza più tarda compatibile è la 129.
  it('onora la pausa PROPRIA del servizio proposto anche quando non precede niente', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('manicure', 138, 18, 0)],
        durations: [6],
        buffers: [3],
      }),
    )
    expect(esito.starts).not.toContain(132)
    expect(esito.starts).not.toContain(130)
    expect(esito.starts).toContain(129)
  })

  // ⚠ discriminante: le due metà INSIEME, con pause DIVERSE, e sull elenco
  // INTERO invece che con toContain.
  //
  // Fascia [108, 180). `prima` occupa 108–119 con pausa 3; `dopo` occupa
  // 140–151 con pausa 0; il servizio dura 6 celle e ha pausa propria 2.
  //   - libere: 120–134 e 152–174
  //   - dopo `prima`: 123 <= inizio
  //   - prima di `dopo`: inizio + 5 + 1 + 2 <= 140, cioè inizio <= 132
  //   - dalla 152 in poi chi precede è `dopo`, che ha pausa 0, e non segue
  //     più niente: tutto il pomeriggio è legittimo
  // Una sola condizione che usasse `Math.max(pausa_del_precedente, pausa
  // propria)` darebbe [123..132] e poi 154..174, non 152: è il motivo per cui
  // l elenco va asserito per intero.
  it('onora tutte e due le pause quando c è qualcosa prima e qualcosa dopo', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('prima', 108, 12, 3), blocco('dopo', 140, 12, 0)],
        durations: [6],
        buffers: [2],
      }),
    )
    const attese = [
      123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
      152, 153, 154, 155, 156, 157, 158, 159, 160, 161,
      162, 163, 164, 165, 166, 167, 168, 169, 170, 171,
      172, 173, 174,
    ]
    expect(esito.starts).toEqual(attese)
  })

  // ⚠ discriminante: D2-9. `lungo` occupa 09:00–10:00 e pretende un ora di
  // riassetto; `corto` è prenotato SUBITO DOPO, dalle 10:00 alle 10:30, e non
  // pretende niente — è scrivibile toccando una cella spenta, che §7.3
  // dichiara legale. Alle 10:30 (cella 126) si PUÒ proporre, perché chi
  // precede è `corto`. Applicando la pausa di OGNI blocco precedente la prima
  // partenza slitterebbe alla 132, cioè le 11:00, nascondendo mezz ora libera.
  it('guarda solo l appuntamento PIÙ VICINO, non tutti quelli prima', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('lungo', 108, 12, 12), blocco('corto', 120, 6, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts[0]).toBe(126)
    expect(esito.starts).toContain(126)
    expect(esito.starts).toContain(131)
  })

  it('accetta una pausa nulla come nessuna pausa', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('prima', 108, 12, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(120)
  })

  // ⚠ discriminante: la pausa NON è occupazione (commento della migrazione
  // 0002: «advisory: applied when proposing, never as occupancy»). Se lo
  // fosse, la fascia libera prima dell appuntamento si accorcerebbe anche
  // all indietro e questa partenza sparirebbe.
  it('non tratta la pausa come occupazione all indietro', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('dopo', 138, 12, 9)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(132)
  })

  it('dice pieno quando le sole partenze possibili cadono per il riassetto', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 120 }],
        occupancy: [blocco('prima', 108, 6, 3)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('full')
  })
})
