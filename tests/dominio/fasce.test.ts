import { describe, expect, it } from 'vitest'
import { piega, risolviGiorno } from '../../src/dominio/fasce'

const MATTINA = { startBoundary: 108, endBoundary: 156 } // 09:00–13:00
const POMERIGGIO = { startBoundary: 180, endBoundary: 228 } // 15:00–19:00

describe('risoluzione del giorno — settimana tipica ed eccezione', () => {
  it('restituisce la settimana tipica quando non c è alcuna eccezione', () => {
    const esito = risolviGiorno({ weekly: [MATTINA, POMERIGGIO], exception: null, closures: [] })
    expect(esito.ranges).toEqual([MATTINA, POMERIGGIO])
    expect(esito.dayStatus).toBe('open')
  })

  it('dichiara l operatrice assente quando la settimana tipica è vuota', () => {
    const esito = risolviGiorno({ weekly: [], exception: null, closures: [] })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: l'eccezione SOSTITUISCE il giorno, non si somma.
  // L'eccezione qui accorcia la mattina e cancella il pomeriggio: se le due
  // liste venissero unite, il pomeriggio riapparirebbe.
  it('lascia che un eccezione sostituisca il giorno invece di sommarsi', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA, POMERIGGIO],
      exception: { ranges: [{ startBoundary: 108, endBoundary: 132 }] },
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 132 }])
    expect(esito.dayStatus).toBe('open')
  })

  it('lascia che un eccezione allunghi il giorno', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA],
      exception: { ranges: [{ startBoundary: 96, endBoundary: 240 }] },
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 96, endBoundary: 240 }])
  })

  // ⚠ discriminante: zero fasce SIGNIFICA assente (spec §6.5, non c è un flag).
  // Con `exception` trattata come falsa quando è senza figli, questa prova
  // vedrebbe tornare la settimana tipica.
  it('tratta un eccezione senza fasce come assenza, non come assenza di eccezione', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA, POMERIGGIO],
      exception: { ranges: [] },
      closures: [],
    })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: l'uscita non deve condividere OGGETTI con l'ingresso, non
  // soltanto l'array. Mutare un ELEMENTO dell'uscita e pretendere l'ingresso
  // intatto è ciò che distingue una copia vera da una copia dell'array con gli
  // stessi oggetti dentro — e resta discriminante anche dopo il Task 4, dove
  // `piega` ricostruisce l'array ma potrebbe riusare gli oggetti.
  it('non lascia che l uscita condivida oggetti con le fasce del chiamante', () => {
    const weekly = [{ startBoundary: 108, endBoundary: 156 }]
    const esito = risolviGiorno({ weekly, exception: null, closures: [] })
    ;(esito.ranges[0] as { endBoundary: number }).endBoundary = 999
    expect(weekly[0].endBoundary).toBe(156)
  })
})

describe('risoluzione del giorno — chiusure e precedenza', () => {
  const GIORNATA = { startBoundary: 108, endBoundary: 228 } // 09:00–19:00

  it('svuota il giorno con una chiusura a giornata intera', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [{ fromBoundary: null, toBoundary: null }],
    })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('salon_closed')
  })

  it('taglia una chiusura parziale dentro una fascia, lasciandone due', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [{ fromBoundary: 150, toBoundary: 162 }], // 12:30–13:30
    })
    expect(esito.ranges).toEqual([
      { startBoundary: 108, endBoundary: 150 },
      { startBoundary: 162, endBoundary: 228 },
    ])
    expect(esito.dayStatus).toBe('open')
  })

  it('accorcia una fascia quando la chiusura ne morde solo la coda', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [{ fromBoundary: 156, toBoundary: 288 }], // dalle 13:00 a fine giornata
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
  })

  it('lascia intatta una fascia che la chiusura non tocca', () => {
    const esito = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 180, toBoundary: 228 }],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
  })

  // ⚠ discriminante: una chiusura che sta TUTTA PRIMA della fascia non deve
  // toglierle niente — e soprattutto non deve AGGIUNGERLE niente.
  //
  // Il valore di confine conta, ed è facile sbagliarlo: una chiusura che
  // finisce ESATTAMENTE dove la fascia comincia (`a === startBoundary`) NON è
  // osservabile, perché togliendo il guardiano `a <= f.startBoundary` scatta
  // un solo `push`, quello che parte da `a`, e ricostruisce la fascia
  // identica. L'unico caso osservabile è `a < startBoundary`, ed è nel verso
  // pericoloso: senza il guardiano la fascia si allungherebbe all'indietro
  // fino alla FINE della chiusura, INVENTANDO disponibilità prima dell'orario
  // di lavoro. Qui la chiusura è 90→100, cioè 07:30–08:20. La fascia comincia
  // a 108, cioè 09:00. Senza il guardiano la fascia partirebbe da 100: 40
  // minuti inventati, dalle 08:20 alle 09:00.
  it('non allunga una fascia all indietro per una chiusura che sta tutta prima', () => {
    const tuttaPrima = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 90, toBoundary: 100 }],
    })
    expect(tuttaPrima.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])

    // Il caso che si tocca: stesso esito, e qui nessuna mutazione lo vede.
    const attaccata = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 96, toBoundary: 108 }],
    })
    expect(attaccata.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
  })

  it('somma due chiusure sovrapposte senza danno', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [
        { fromBoundary: 150, toBoundary: 170 },
        { fromBoundary: 160, toBoundary: 180 },
      ],
    })
    expect(esito.ranges).toEqual([
      { startBoundary: 108, endBoundary: 150 },
      { startBoundary: 180, endBoundary: 228 },
    ])
  })

  // ⚠ discriminante: parte dall'esempio del 24 dicembre di spec §7.4. Là il
  // salone è chiuso dalle 13:00 e Alessandra lavora 09:00–13:00, cioè 108→156.
  //
  // La prima metà prende quell'esempio alla lettera: chiusura 156→288, dalle
  // 13:00 a mezzanotte. Non tocca la fascia, che finisce proprio alle 13:00:
  // il giorno resta 'open'. Quindi l'esempio di §7.4, così com'è scritto, NON
  // svuota il giorno. (§6.5 nomina lo stesso giorno in modo ambiguo, e non
  // chiarisce.)
  //
  // La seconda metà usa uno scenario SCELTO per svuotare il giorno, non una
  // citazione della spec: chiusura 96→156, dalle 08:00 alle 13:00. Copre tutta
  // la fascia: il giorno resta senza fasce, e DEVE leggersi «salone chiuso»,
  // non «aperto e pieno» né «operatrice assente».
  it('legge come salone chiuso una chiusura PARZIALE che svuota il giorno', () => {
    const esito = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }], // 09:00–13:00
      exception: null,
      closures: [{ fromBoundary: 156, toBoundary: 288 }], // chiuso dalle 13:00
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
    expect(esito.dayStatus).toBe('open')

    const chiusoPrima = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 96, toBoundary: 156 }], // chiuso fino alle 13:00
    })
    expect(chiusoPrima.ranges).toEqual([])
    expect(chiusoPrima.dayStatus).toBe('salon_closed')
  })

  // ⚠ discriminante: D2-6, il ramo che distingue chi ha svuotato il giorno.
  // Qui l'operatrice era GIÀ assente e la chiusura è parziale: non è la
  // chiusura ad aver svuotato il giorno, quindi lo stato è operator_off.
  it('non attribuisce alla chiusura parziale un giorno che era già vuoto', () => {
    const esito = risolviGiorno({
      weekly: [],
      exception: null,
      closures: [{ fromBoundary: 150, toBoundary: 162 }],
    })
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: D2-6, l'altro ramo. Con una chiusura a giornata INTERA
  // il salone è chiuso, e questo vince anche se l'operatrice era assente.
  it('dice salone chiuso quando la chiusura è intera, anche se l operatrice era assente', () => {
    const esito = risolviGiorno({
      weekly: [],
      exception: null,
      closures: [{ fromBoundary: null, toBoundary: null }],
    })
    expect(esito.dayStatus).toBe('salon_closed')
  })

  // ⚠ discriminante: §6.6. La chiusura batte l'eccezione, che batte la
  // settimana tipica. L'eccezione qui ALLUNGA il giorno, e la chiusura taglia
  // comunque: se la chiusura fosse applicata alla settimana tipica invece che
  // all'eccezione, il risultato sarebbe un altro.
  it('applica la chiusura DOPO l eccezione, non alla settimana tipica', () => {
    const esito = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: { ranges: [{ startBoundary: 96, endBoundary: 240 }] },
      closures: [{ fromBoundary: 96, toBoundary: 120 }],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 120, endBoundary: 240 }])
  })
})

describe('la piega delle fasce contigue', () => {
  it('ordina le fasce che arrivano disordinate', () => {
    expect(
      piega([
        { startBoundary: 180, endBoundary: 228 },
        { startBoundary: 108, endBoundary: 156 },
      ]),
    ).toEqual([
      { startBoundary: 108, endBoundary: 156 },
      { startBoundary: 180, endBoundary: 228 },
    ])
  })

  // ⚠ discriminante: è l'esempio misurato di spec §7.2. 09:00–12:00 e
  // 12:00–15:00 sono due fasce legali che si TOCCANO, ed è una mattina
  // continua. Senza la piega, un massaggio da 10 celle che parte alla 140
  // (11:40) arriva alla 150 e non sta in nessuna delle due.
  it('fonde due fasce che si toccano', () => {
    expect(
      piega([
        { startBoundary: 108, endBoundary: 144 },
        { startBoundary: 144, endBoundary: 180 },
      ]),
    ).toEqual([{ startBoundary: 108, endBoundary: 180 }])
  })

  // ⚠ discriminante: TRE fasce che si toccano. È il caso che una passata a
  // coppie sbaglia e una piega azzecca. Una passata a coppie produce
  // [108,180) e [144,216), che si SOVRAPPONGONO.
  it('fonde tre fasce che si toccano in una sola, senza sovrapposizioni', () => {
    const esito = piega([
      { startBoundary: 108, endBoundary: 144 },
      { startBoundary: 144, endBoundary: 180 },
      { startBoundary: 180, endBoundary: 216 },
    ])
    expect(esito).toEqual([{ startBoundary: 108, endBoundary: 216 }])
    expect(esito).toHaveLength(1)
  })

  // ⚠ discriminante: la piega usa max(fine), non la fine dell'ultima letta.
  // Qui la seconda fascia è INTERAMENTE dentro la prima: prendere la sua fine
  // accorcerebbe il risultato da 228 a 150.
  it('usa il massimo delle fini quando una fascia è contenuta nell altra', () => {
    expect(
      piega([
        { startBoundary: 108, endBoundary: 228 },
        { startBoundary: 120, endBoundary: 150 },
      ]),
    ).toEqual([{ startBoundary: 108, endBoundary: 228 }])
  })

  it('lascia separata una vera pausa pranzo', () => {
    expect(
      piega([
        { startBoundary: 108, endBoundary: 156 },
        { startBoundary: 180, endBoundary: 228 },
      ]),
    ).toEqual([
      { startBoundary: 108, endBoundary: 156 },
      { startBoundary: 180, endBoundary: 228 },
    ])
  })

  it('non cambia niente su zero o una fascia', () => {
    expect(piega([])).toEqual([])
    expect(piega([{ startBoundary: 108, endBoundary: 156 }])).toEqual([
      { startBoundary: 108, endBoundary: 156 },
    ])
  })

  // ⚠ discriminante: la piega non deve restituire gli OGGETTI che ha ricevuto.
  // È la seconda metà della garanzia contro l'aliasing del Task 2: lì la
  // copiava `risolviGiorno`, qui l'array viene ricostruito da `piega`, e senza
  // `copia` gli oggetti tornerebbero a essere condivisi.
  it('non restituisce gli oggetti che le sono stati passati', () => {
    const dentro = [{ startBoundary: 108, endBoundary: 156 }]
    const fuori = piega(dentro)
    ;(fuori[0] as { endBoundary: number }).endBoundary = 999
    expect(dentro[0].endBoundary).toBe(156)
  })

  it('restituisce fasce piegate da risolviGiorno', () => {
    const esito = risolviGiorno({
      weekly: [
        { startBoundary: 144, endBoundary: 180 },
        { startBoundary: 108, endBoundary: 144 },
      ],
      exception: null,
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 180 }])
  })
})
