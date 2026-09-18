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
