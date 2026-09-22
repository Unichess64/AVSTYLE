import { describe, expect, it } from 'vitest'
import { decodificaFinestra } from '../../src/dominio/finestra'
import { ORIZZONTE_GIORNI, cercaPosti } from '../../src/dominio/cercaposti'
import type { DocumentoFinestra } from '../../src/dominio/finestra'

const VERA = 'operatrice-vera'
const ALESSANDRA = 'operatrice-alessandra'
// 2026-03-12 è giovedì: weekday 3. 2026-03-13 è venerdì: weekday 4.
const GIOVEDI = 3
const VENERDI = 4

function documento(sopra: Partial<DocumentoFinestra> = {}): DocumentoFinestra {
  return {
    weekly: [{ operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 }],
    exceptions: [],
    closures: [],
    occupancy: [],
    ...sopra,
  }
}

describe('decodifica della finestra', () => {
  it('risolve un giorno dalla settimana tipica', () => {
    const f = decodificaFinestra(documento())
    const g = f.giorno(VERA, '2026-03-12')
    expect(g.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
    expect(g.dayStatus).toBe('open')
  })

  // ⚠ discriminante: la settimana tipica si sceglie per GIORNO DELLA SETTIMANA.
  // Il 13 marzo è venerdì e l operatrice non ha fasce quel giorno.
  it('non applica la fascia del giovedì al venerdì', () => {
    const f = decodificaFinestra(documento())
    expect(f.giorno(VERA, '2026-03-13').dayStatus).toBe('operator_off')
  })

  it('lascia che l eccezione sostituisca il giorno', () => {
    const f = decodificaFinestra(
      documento({
        exceptions: [
          { operator_id: VERA, date: '2026-03-12', ranges: [{ start_boundary: 96, end_boundary: 120 }] },
        ],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').ranges).toEqual([{ startBoundary: 96, endBoundary: 120 }])
  })

  // ⚠ discriminante: l eccezione vale per la SUA data e per la sua operatrice.
  // Applicarla al giorno dopo, o all altra operatrice, è l errore che questa
  // prova coglie.
  it('applica l eccezione solo alla sua data e alla sua operatrice', () => {
    const f = decodificaFinestra(
      documento({
        weekly: [
          { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
          { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
        ],
        exceptions: [{ operator_id: VERA, date: '2026-03-12', ranges: [] }],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').dayStatus).toBe('operator_off')
    expect(f.giorno(VERA, '2026-03-19').dayStatus).toBe('open')
    expect(f.giorno(ALESSANDRA, '2026-03-12').dayStatus).toBe('open')
  })

  // ⚠ discriminante: una chiusura copre un INTERVALLO di date, ed è la ragione
  // per cui `salon_closure` ha due date invece di una.
  it('applica una chiusura a ogni data del suo intervallo', () => {
    const f = decodificaFinestra(
      documento({
        weekly: [
          { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
          { operator_id: VERA, weekday: VENERDI, start_boundary: 108, end_boundary: 156 },
        ],
        closures: [
          {
            start_date: '2026-03-12',
            end_date: '2026-03-13',
            from_boundary: null,
            to_boundary: null,
            reason: 'Ferie',
          },
        ],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').dayStatus).toBe('salon_closed')
    expect(f.giorno(VERA, '2026-03-13').dayStatus).toBe('salon_closed')
    expect(f.giorno(VERA, '2026-03-19').dayStatus).toBe('open')
  })

  // ⚠ discriminante: l occupazione si costruisce con blocco() a partire da
  // cell_count (D2-1), e si filtra per giorno E per operatrice. L ultima cella
  // di un blocco che parte alla 120 e dura 18 celle è la 137.
  it('costruisce i blocchi con blocco() e li filtra per giorno e operatrice', () => {
    const f = decodificaFinestra(
      documento({
        occupancy: [
          {
            appointment_id: 'a1',
            operator_id: VERA,
            date: '2026-03-12',
            start_cell: 120,
            cell_count: 18,
            buffer_after_cells: 3,
          },
          {
            appointment_id: 'a2',
            operator_id: ALESSANDRA,
            date: '2026-03-12',
            start_cell: 120,
            cell_count: 18,
            buffer_after_cells: 0,
          },
          {
            appointment_id: 'a3',
            operator_id: VERA,
            date: '2026-03-19',
            start_cell: 120,
            cell_count: 18,
            buffer_after_cells: 0,
          },
        ],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').occupancy).toEqual([
      { appointmentId: 'a1', startCell: 120, endCell: 137, bufferAfterCells: 3 },
    ])
  })
})

describe('cercaPosti', () => {
  function ingressoCerca(sopra: Record<string, unknown> = {}) {
    return {
      from: '2026-03-12',
      days: ORIZZONTE_GIORNI,
      operatorIds: [VERA],
      finestra: decodificaFinestra(documento()),
      durations: [6],
      buffers: [0],
      excludeAppointmentIds: [] as string[],
      today: null as string | null,
      nowCell: null as number | null,
      preferredOperatorId: null as string | null,
      limit: 5,
      ...sopra,
    }
  }

  it('cerca su 28 giorni', () => {
    expect(ORIZZONTE_GIORNI).toBe(28)
  })

  it('restituisce le proposte in ordine di data', () => {
    const esito = cercaPosti(ingressoCerca({ limit: 2 }))
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: VERA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 109 },
    ])
    expect(esito.reason).toBeNull()
  })

  // ⚠ discriminante: l orizzonte è di 28 giorni a partire da `from`, estremi
  // compresi: il 2026-04-08 è il ventottesimo ed è dentro, il 2026-04-09 è
  // fuori. Una fascia SOLO in quel giorno distingue i due confini.
  it('arriva al ventottesimo giorno e non al ventinovesimo', () => {
    const soloIlNove = documento({
      weekly: [],
      exceptions: [
        { operator_id: VERA, date: '2026-04-09', ranges: [{ start_boundary: 108, end_boundary: 156 }] },
      ],
    })
    const soloIlOtto = documento({
      weekly: [],
      exceptions: [
        { operator_id: VERA, date: '2026-04-08', ranges: [{ start_boundary: 108, end_boundary: 156 }] },
      ],
    })
    expect(cercaPosti(ingressoCerca({ finestra: decodificaFinestra(soloIlNove) })).rows).toEqual([])
    expect(
      cercaPosti(ingressoCerca({ finestra: decodificaFinestra(soloIlOtto) })).rows[0]?.date,
    ).toBe('2026-04-08')
  })

  it('si ferma al limite chiesto', () => {
    expect(cercaPosti(ingressoCerca({ limit: 3 })).rows).toHaveLength(3)
  })

  // ⚠ discriminante: D2-11. A parità di data si ordina per ORARIO fra TUTTE le
  // operatrici. Alessandra apre alle 09:00 (cella 108) e Vera alle 09:10
  // (cella 110); l elenco del chiamante mette Vera per prima. Raccogliendo
  // un operatrice alla volta — come faceva la revisione 1 — la prima riga
  // sarebbe di Vera alle 09:10, cioè una proposta PEGGIORE in cima.
  it('ordina per orario fra le operatrici a parità di data', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 110, end_boundary: 116 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 110 },
    ])
  })

  // ⚠ discriminante: D2-11, la metà che decide. La preferita è Vera, che apre
  // alle 09:10; Alessandra apre alle 09:00. La preferenza NON deve scavalcare
  // un orario migliore — è il SOLO caso che combina una preferita valorizzata
  // con orari d inizio diversi nello stesso giorno, e senza di esso la sonda
  // che sposta la preferenza davanti all orario non può diventare rossa.
  it('non lascia che la preferita scavalchi un orario migliore', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 110, end_boundary: 116 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        preferredOperatorId: VERA,
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 110 },
    ])
  })

  // ⚠ discriminante: D2-11. La preferita vince SOLO a parità di orario. Qui le
  // due operatrici propongono entrambe le 09:00 e la preferita è Alessandra,
  // che nell elenco del chiamante viene seconda.
  it('mette la preferita prima a parità di orario', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        preferredOperatorId: ALESSANDRA,
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 108 },
    ])
  })

  // ⚠ discriminante: la DATA batte la preferenza. Alessandra lavora il giovedì
  // 12, Vera solo il venerdì 13, e la preferita è Vera: la prima riga deve
  // essere del 12 con Alessandra. Se la preferenza scavalcasse la data — che è
  // l errore che §8.3 nomina — la prima riga sarebbe del 13.
  it('non lascia che la preferita scavalchi una data precedente', () => {
    const due = documento({
      weekly: [
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: VERA, weekday: VENERDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        preferredOperatorId: VERA,
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-13', operatorId: VERA, startCell: 108 },
    ])
  })

  // ⚠ discriminante: §8.3 dice che quando nessuna cliente è stata scelta NON
  // si applica alcuna preferenza. A parità di orario l ordine è quello in cui
  // il chiamante ha passato le operatrici, e resta stabile.
  it('senza preferita tiene l ordine in cui il chiamante ha passato le operatrici', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [ALESSANDRA, VERA],
        preferredOperatorId: null,
        limit: 2,
      }),
    )
    expect(esito.rows.map((r) => r.operatorId)).toEqual([ALESSANDRA, VERA])
  })

  // ⚠ discriminante: `nowCell` si applica SOLO a `today`. Se si applicasse a
  // ogni giorno, il 19 marzo perderebbe il mattino.
  it('filtra l ora corrente solo sul giorno che è oggi', () => {
    const esito = cercaPosti(ingressoCerca({ today: '2026-03-12', nowCell: 150, limit: 3 }))
    expect(esito.rows[0]).toEqual({ date: '2026-03-12', operatorId: VERA, startCell: 150 })
    const soloFuturi = cercaPosti(ingressoCerca({ today: '2026-03-12', nowCell: 288, limit: 1 }))
    expect(soloFuturi.rows[0]?.date).toBe('2026-03-19')
    expect(soloFuturi.rows[0]?.startCell).toBe(108)
  })

  // ⚠ discriminante: D2-7. Fra 28 giorni ci sono un giorno chiuso e uno aperto
  // ma pieno: il motivo riportato è quello del giorno aperto, perché estendere
  // l orizzonte ha senso solo in quel caso.
  //
  // ⚠ discriminante anche sul CABLAGGIO di §7.4. Ogni altra prova di questo
  // file passa `buffers: [0]` e `excludeAppointmentIds: []`, e su quei due
  // valori il cablaggio non è osservabile: con pausa nulla il riassetto non
  // vincola niente, e con elenco vuoto filtrare o non filtrare l occupazione
  // è la stessa cosa. Qui la fascia è 108–120 e l appuntamento occupa
  // 114–119: le celle 108–113 sono LIBERE, ed è solo la pausa PROPRIA di 3
  // celle a renderle improponibili. Se `buffers` non arrivasse a
  // proposeStarts, il giorno non sarebbe pieno. E il secondo giro esclude
  // quell appuntamento: se `excludeAppointmentIds` non arrivasse, la prima
  // riga non esisterebbe.
  it('riporta full quando almeno un giorno era aperto e pieno', () => {
    const pieno = documento({
      weekly: [{ operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 120 }],
      occupancy: [
        {
          appointment_id: 'a1',
          operator_id: VERA,
          date: '2026-03-12',
          start_cell: 114,
          cell_count: 6,
          buffer_after_cells: 0,
        },
      ],
      closures: [
        {
          start_date: '2026-03-19',
          end_date: '2026-04-09',
          from_boundary: null,
          to_boundary: null,
          reason: 'Ferie',
        },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({ finestra: decodificaFinestra(pieno), durations: [6], buffers: [3] }),
    )
    expect(esito.rows).toEqual([])
    expect(esito.reason).toBe('full')

    const spostando = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(pieno),
        durations: [6],
        buffers: [3],
        excludeAppointmentIds: ['a1'],
      }),
    )
    expect(spostando.rows[0]).toEqual({
      date: '2026-03-12',
      operatorId: VERA,
      startCell: 108,
    })
    expect(spostando.reason).toBeNull()
  })

  it('riporta salone chiuso quando ogni giorno dell orizzonte lo è', () => {
    const chiuso = documento({
      closures: [
        {
          start_date: '2026-03-01',
          end_date: '2026-05-01',
          from_boundary: null,
          to_boundary: null,
          reason: 'Ferie',
        },
      ],
    })
    const esito = cercaPosti(ingressoCerca({ finestra: decodificaFinestra(chiuso) }))
    expect(esito.reason).toBe('salon_closed')
  })

  // ⚠ discriminante: è §13.1 riga per riga — «ogni dayStatus col suo motivo,
  // COMPRESA la chiusura parziale che svuota il giorno, che deve leggersi
  // chiusa e non piena» — percorsa DA CAPO A FONDO, dal documento grezzo fino
  // al codice di motivo. Lo scenario è ispirato al 24 dicembre di spec §7.4,
  // ma i numeri sono SCELTI per svuotare il giorno, non citati dalla spec:
  // l operatrice lavora 108→156, cioè 09:00–13:00, e il salone è chiuso
  // 96→156, cioè dalle 08:00 alle 13:00. L esempio di §7.4 preso alla lettera
  // (chiuso dalle 13:00) non svuoterebbe il giorno: una chiusura che comincia
  // alle 13:00 non tocca una fascia che finisce alle 13:00. Lo mostra la prima
  // metà della prova gemella in fasce.test.ts, che attende 'open'.
  //
  // Le due metà di questa regola sono provate separatamente nei Task 3 e 5, e
  // questa è l unica prova che le congiunge: una rottura del cablaggio fra i
  // due moduli resterebbe verde senza di lei.
  it('porta una chiusura parziale fino al motivo salone chiuso', () => {
    const vigilia = documento({
      weekly: [{ operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 }],
      closures: [
        {
          start_date: '2026-03-12',
          end_date: '2026-03-12',
          from_boundary: 96,
          to_boundary: 156,
          reason: 'Vigilia',
        },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({ finestra: decodificaFinestra(vigilia), days: 1 }),
    )
    expect(esito.rows).toEqual([])
    expect(esito.reason).toBe('salon_closed')
  })

  it('riporta servizio troppo lungo quando non sta in nessun giorno aperto', () => {
    const esito = cercaPosti(ingressoCerca({ durations: [60], buffers: [0] }))
    expect(esito.rows).toEqual([])
    expect(esito.reason).toBe('service_too_long')
  })

  // Di contorno, NON discriminante: `cercaPosti` cicla solo su `operatorIds`,
  // quindi questa asserzione è vera per costruzione e nessuna mutazione può
  // renderla rossa. Resta perché documenta la divisione di responsabilità di
  // §7.4 — l insieme delle idonee lo risolve il chiamante — ma non conta come
  // presidio: il presidio vero sulle disattivate è nel Task 10.
  it('non propone un operatrice che non è nell elenco ammesso', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({ finestra: decodificaFinestra(due), operatorIds: [VERA], limit: 50 }),
    )
    expect(esito.rows.every((r) => r.operatorId === VERA)).toBe(true)
  })
})
