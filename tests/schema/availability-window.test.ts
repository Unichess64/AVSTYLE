import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  ANNALISA,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'
import {
  CLIENT_MARIA,
  DAY_ONE,
  DAY_TWO,
  SERVICE_MASSAGE,
  SERVICE_REFILL,
  seedFixture,
} from '../helpers/fixtures'

const VISIT_UNO = '50000000-0000-4000-8000-0000000000a1'
const VISIT_DUE = '50000000-0000-4000-8000-0000000000a2'
const APPT = '60000000-0000-4000-8000-0000000000a1'
const FIRMA = 'public.availability_window(date, date, uuid[])'

// DAY_ONE è 2026-03-12 e DAY_TWO è 2026-03-19: entrambi giovedì, weekday 3.
const GIOVEDI = 3
const VENERDI = 4

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

async function finestra(from: string, to: string, operatori: string[] | null) {
  return asOperator(VERA_AUTH, async (c) => {
    const r = await c.query<{ w: Record<string, unknown[]> }>(
      'select public.availability_window($1::date, $2::date, $3::uuid[]) as w',
      [from, to, operatori],
    )
    return r.rows[0].w
  })
}

/** Una visita con un appuntamento, scritta da proprietario. */
async function prenota(
  visitId: string,
  data: string,
  operatorId: string,
  serviceId: string,
  startCell: number,
  cellCount: number,
  appointmentId?: string,
) {
  await asOwner(async (c) => {
    await c.query(
      `insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)
       on conflict (id) do nothing`,
      [visitId, CLIENT_MARIA, data],
    )
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5::date, $6, $7)`,
      [appointmentId ?? null, visitId, operatorId, serviceId, data, startCell, cellCount],
    )
  })
}

describe('availability_window', () => {
  it('restituisce quattro elenchi, vuoti quando non c è niente', async () => {
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    expect(Object.keys(w).sort()).toEqual(['closures', 'exceptions', 'occupancy', 'weekly'])
    expect(w.weekly).toEqual([])
    expect(w.exceptions).toEqual([])
    expect(w.closures).toEqual([])
    expect(w.occupancy).toEqual([])
  })

  // ⚠ discriminante anche sull ORDINE: due righe per Vera, inserite col
  // venerdì PRIMA del giovedì, e l esito atteso è ordinato. Con una riga sola
  // l `order by` della sezione sarebbe dichiarato e mai esercitato.
  it('riporta la settimana tipica dell operatrice chiesta, ordinata, e non delle altre', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $4, 180, 228), ($2, $3, 120, 168), ($1, $3, 108, 156)`,
        [VERA, ANNALISA, GIOVEDI, VENERDI],
      )
    })
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    expect(w.weekly).toEqual([
      { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
      { operator_id: VERA, weekday: VENERDI, start_boundary: 180, end_boundary: 228 },
    ])
  })

  // ⚠ discriminante: l eccezione porta le sue fasce ANNIDATE e ordinate, e un
  // giorno di eccezione SENZA fasce deve comparire lo stesso con un elenco
  // vuoto — è l assenza dichiarata di §6.5, e se sparisse la risoluzione
  // tornerebbe alla settimana tipica.
  it('annida le fasce dell eccezione e conserva un eccezione senza fasce', async () => {
    await asOwner(async (c) => {
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_ONE,
        [[120, 132], [96, 108]],
      ])
      await c.query('select public.write_exception_day($1, $2::date, null)', [ANNALISA, DAY_ONE])
    })
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA, ANNALISA])
    expect(w.exceptions).toEqual([
      {
        operator_id: VERA,
        date: DAY_ONE,
        ranges: [
          { start_boundary: 96, end_boundary: 108 },
          { start_boundary: 120, end_boundary: 132 },
        ],
      },
      { operator_id: ANNALISA, date: DAY_ONE, ranges: [] },
    ])
  })

  // ⚠ discriminante: una chiusura si sovrappone all intervallo anche se non ci
  // sta dentro. Una condizione `between p_from and p_to` sulle sue date la
  // perderebbe, e il salone risulterebbe aperto in una settimana di ferie.
  // ⚠ discriminante anche sull ORDINE: due chiusure, inserite dalla più
  // recente alla più vecchia, ed entrambe si sovrappongono al giorno chiesto.
  // Con una sola, l `order by c.start_date` sarebbe dichiarato e mai esercitato.
  it('prende le chiusure che inglobano l intervallo senza starci dentro, ordinate', async () => {
    await asOwner((c) =>
      c.query(
        `insert into salon_closure (start_date, end_date, from_boundary, to_boundary, reason)
         values ('2026-03-10', '2026-03-14', 96, 120, 'Corso'),
                ('2026-03-01', '2026-03-31', null, null, 'Ferie')`,
      ),
    )
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    expect(w.closures).toEqual([
      {
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        from_boundary: null,
        to_boundary: null,
        reason: 'Ferie',
      },
      {
        start_date: '2026-03-10',
        end_date: '2026-03-14',
        from_boundary: 96,
        to_boundary: 120,
        reason: 'Corso',
      },
    ])
  })

  // ⚠ discriminante: D2-1 sul lato SQL. La funzione restituisce cell_count
  // GREZZO: l ultima cella occupata la calcola blocco() e nessun altro. Se qui
  // comparisse un end_cell, l aritmetica esisterebbe in due lingue. E
  // buffer_after_cells viene dal SERVIZIO, non dall appuntamento: senza la
  // giunzione la regola del riassetto non è calcolabile.
  it('riporta l occupazione con il conteggio delle celle e la pausa del servizio', async () => {
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18, APPT)
    await prenota(VISIT_UNO, DAY_ONE, ALESSANDRA, SERVICE_MASSAGE, 150, 10)
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA, ALESSANDRA])
    const righe = w.occupancy as Array<Record<string, unknown>>
    expect(righe).toHaveLength(2)
    expect(righe.find((r) => r.appointment_id === APPT)).toEqual({
      appointment_id: APPT,
      operator_id: VERA,
      date: DAY_ONE,
      start_cell: 120,
      cell_count: 18,
      buffer_after_cells: 0,
    })
    // Il massaggio porta la pausa da 3 celle del suo SERVIZIO.
    expect(righe.find((r) => r.operator_id === ALESSANDRA)).toMatchObject({
      start_cell: 150,
      cell_count: 10,
      buffer_after_cells: 3,
    })
  })

  // ⚠ discriminante: è la ragione d ESSERE della funzione — un INTERVALLO di
  // date, non un giorno. Con una sola data positiva, mutare
  // `between p_from and p_to` in `= p_from` lascerebbe verde ogni altra prova
  // di questo file. Qui ci sono due giorni, due appuntamenti e due eccezioni,
  // e l ordine per data è asserito sull elenco intero.
  it('restituisce tutti i giorni dell intervallo, non solo il primo', async () => {
    // Il SECONDO giorno ha la cella d inizio PIÙ PICCOLA del primo: così
    // l ordine per data e l ordine per cella non coincidono, e una mutazione
    // che ordinasse per `start_cell` diventa osservabile. Con 120 e poi 150 i
    // due ordini davano lo stesso esito e la sonda era inerte.
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 150, 18)
    await prenota(VISIT_DUE, DAY_TWO, VERA, SERVICE_REFILL, 120, 18)
    await asOwner(async (c) => {
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_TWO,
        [[96, 120]],
      ])
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_ONE,
        [[108, 156]],
      ])
    })
    const w = await finestra(DAY_ONE, DAY_TWO, [VERA])

    const occupazione = (w.occupancy as Array<Record<string, unknown>>).map((r) => [
      r.date,
      r.start_cell,
    ])
    expect(occupazione).toEqual([
      [DAY_ONE, 150],
      [DAY_TWO, 120],
    ])

    const eccezioni = (w.exceptions as Array<Record<string, unknown>>).map((e) => e.date)
    expect(eccezioni).toEqual([DAY_ONE, DAY_TWO])
  })

  it('non riporta un appuntamento fuori dall intervallo di date', async () => {
    await prenota(VISIT_UNO, '2026-04-20', VERA, SERVICE_REFILL, 120, 18)
    const w = await finestra(DAY_ONE, '2026-04-08', [VERA])
    expect(w.occupancy).toEqual([])
  })

  // ⚠ discriminante: l occupazione si filtra per OPERATRICE, non solo per
  // data. La sicurezza per riga lascia a un operatrice attiva l agenda intera,
  // quindi senza questo filtro il cercaposti tratterebbe gli appuntamenti
  // altrui come occupanti delle proprie celle.
  it('non riporta l occupazione di un operatrice che non è stata chiesta', async () => {
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18, APPT)
    await prenota(VISIT_UNO, DAY_ONE, ALESSANDRA, SERVICE_MASSAGE, 150, 10)
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    const righe = w.occupancy as Array<Record<string, unknown>>
    expect(righe).toHaveLength(1)
    expect(righe[0].appointment_id).toBe(APPT)
  })

  // ⚠ discriminante: D2-10, ed è l unica prova di tutto il piano che vede
  // un operatrice disattivata — resetData() le riattiva tutte a ogni prova, e
  // senza questa il predicato `is_active` sarebbe dichiarato e mai esercitato.
  //
  // Asserisce ENTRAMBI i lati del confine: la DISPONIBILITÀ di chi è stata
  // disattivata sparisce, perché è il danno che spec §7.4 nomina — «il
  // cercaposti continua a proporre appuntamenti con chi se n è andata il mese
  // scorso» — ma la sua OCCUPAZIONE resta, perché quelle celle sono davvero
  // prese e il vincolo del database le rifiuterebbe comunque. Una finestra che
  // le dichiarasse libere direbbe una bugia che salta fuori solo al
  // salvataggio, con un errore di vincolo al posto di «occupato».
  //
  // ⚠ La disponibilità è DUE tabelle, non una: la settimana tipica E le
  // eccezioni. §7.1 dice che l eccezione SOSTITUISCE il giorno, quindi
  // un operatrice disattivata con un eccezione su un giorno futuro tornerebbe
  // proponibile anche senza settimana tipica. Per questo ANNALISA porta qui
  // tutte e tre le cose — fascia settimanale, eccezione e appuntamento — e il
  // confine è asserito su tutte e tre le sezioni: senza l eccezione,
  // `and o.is_active` sulla giunzione delle eccezioni sarebbe dichiarato e mai
  // esercitato, e a coprirlo non basterebbe il suo gemello su `weekly`.
  it('toglie le fasce di un operatrice disattivata e tiene la sua occupazione', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $3, 108, 156), ($2, $3, 108, 156)`,
        [VERA, ANNALISA, GIOVEDI],
      )
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        ANNALISA,
        DAY_ONE,
        [[96, 132]],
      ])
    })
    await prenota(VISIT_UNO, DAY_ONE, ANNALISA, SERVICE_REFILL, 120, 18)

    const prima = await finestra(DAY_ONE, DAY_ONE, [VERA, ANNALISA])
    expect(prima.weekly).toHaveLength(2)
    expect(prima.exceptions).toEqual([
      {
        operator_id: ANNALISA,
        date: DAY_ONE,
        ranges: [{ start_boundary: 96, end_boundary: 132 }],
      },
    ])
    expect(prima.occupancy).toHaveLength(1)

    // Vera resta attiva: la guardia anti-blocco di 0009 rifiuterebbe di
    // disattivare l ultima operatrice collegata.
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))

    const dopo = await finestra(DAY_ONE, DAY_ONE, [VERA, ANNALISA])
    expect(dopo.weekly).toEqual([
      { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
    ])
    // L eccezione di chi è stata disattivata sparisce insieme alla sua
    // settimana tipica: la riga esiste ancora nella tabella, ed è la giunzione
    // su `operator` attiva a toglierla dal documento.
    expect(dopo.exceptions).toEqual([])
    expect(dopo.occupancy).toHaveLength(1)
    expect((dopo.occupancy as Array<Record<string, unknown>>)[0]).toMatchObject({
      operator_id: ANNALISA,
      start_cell: 120,
      cell_count: 18,
    })
  })

  // ⚠ discriminante: D2-8. Un elenco nullo NON vale «tutte»: un errore del
  // chiamante deve produrre il vuoto sulle tre sezioni che hanno un operatrice.
  // `closures` NON è filtrato per operatrice — una chiusura è del salone — e
  // la prova lo asserisce invece di promettere un documento interamente vuoto.
  //
  // ⚠ Ognuna delle tre sezioni filtrate porta qui una riga SEMINATA, eccezione
  // compresa: un `toEqual([])` su una tabella vuota non misura il filtro, misura
  // il seme che manca. È l eccezione a presidiare `e.operator_id = any(…)`:
  // senza quel predicato, con un elenco nullo il documento porterebbe le
  // eccezioni di TUTTE e la lettura sicura di D2-8 degraderebbe in silenzio.
  it('tratta un elenco nullo di operatrici come nessuna operatrice', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      )
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_ONE,
        [[108, 156]],
      ])
      await c.query(
        `insert into salon_closure (start_date, end_date, from_boundary, to_boundary, reason)
         values ($1::date, $1::date, null, null, 'Ferie')`,
        [DAY_ONE],
      )
    })
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18)
    const w = await finestra(DAY_ONE, DAY_ONE, null)
    expect(w.weekly).toEqual([])
    expect(w.exceptions).toEqual([])
    expect(w.occupancy).toEqual([])
    expect(w.closures).toHaveLength(1)
  })

  // ⚠ discriminante: security invoker significa che la sicurezza per riga
  // arbitra. Un account autenticato che non è operatrice deve vedere elenchi
  // VUOTI, non un errore e non i dati.
  it('non restituisce nulla a un account che non è operatrice', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      )
      // Seminata apposta: `exceptions` è l unica sezione che l estraneo
      // chiede per un operatrice esistente, quindi il suo vuoto misura la
      // politica `exception_day_access` solo se una riga c è davvero.
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_ONE,
        [[108, 156]],
      ])
    })
    const w = await asOperator(OUTSIDER_AUTH, async (c) => {
      const r = await c.query<{ w: Record<string, unknown[]> }>(
        'select public.availability_window($1::date, $2::date, $3::uuid[]) as w',
        [DAY_ONE, DAY_ONE, [VERA]],
      )
      return r.rows[0].w
    })
    expect(w.weekly).toEqual([])
    expect(w.exceptions).toEqual([])
    expect(w.occupancy).toEqual([])
    // `closures` è l unica sezione non filtrata per operatrice: la sua sola
    // difesa contro un estraneo è la politica `salon_closure_access`. Senza
    // questa riga, se quella politica sparisse nessuna prova lo vedrebbe.
    expect(w.closures).toEqual([])
  })

  // ⚠ discriminante: «chiama come anon e aspettati 42501» non distingue
  // «EXECUTE revocato» da «EXECUTE concesso e il corpo inciampa altrove».
  // has_function_privilege lo distingue, e vede anche una concessione a PUBLIC.
  // Misurato il 18 settembre 2026: 'public' È accettato come pseudo-ruolo, e
  // un nome di ruolo inesistente solleva 42704, quindi la riga non è inerte.
  it('nega EXECUTE ad anon e a public, e lo concede ad authenticated', async () => {
    const codice = await asAnon(async (c) => {
      try {
        await c.query('select public.availability_window($1::date, $2::date, $3::uuid[])', [
          DAY_ONE,
          DAY_ONE,
          [VERA],
        ])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('42501')

    const privilegi = await asOwner(async (c) => {
      const r = await c.query<{ anon: boolean; pubblico: boolean; autenticato: boolean }>(
        `select has_function_privilege('anon', $1, 'EXECUTE') as anon,
                has_function_privilege('public', $1, 'EXECUTE') as pubblico,
                has_function_privilege('authenticated', $1, 'EXECUTE') as autenticato`,
        [FIRMA],
      )
      return r.rows[0]
    })
    expect(privilegi.anon).toBe(false)
    expect(privilegi.pubblico).toBe(false)
    expect(privilegi.autenticato).toBe(true)
  })

  // ⚠ discriminante: `proconfig` è asserito insieme a provolatile e prosecdef.
  // Il presidio di catalogo di catalogue-audit.test.ts filtra su prosecdef e
  // quindi NON guarda questa funzione, che è invoker: senza questa riga
  // togliere `set search_path = ''` non renderebbe rossa alcuna prova.
  it('è dichiarata stable, security invoker e con search_path vuoto', async () => {
    const riga = await asOwner(async (c) => {
      const r = await c.query<{ provolatile: string; prosecdef: boolean; proconfig: string[] | null }>(
        `select p.provolatile, p.prosecdef, p.proconfig
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'availability_window'`,
      )
      return r.rows[0]
    })
    expect(riga.provolatile).toBe('s')
    expect(riga.prosecdef).toBe(false)
    expect(riga.proconfig).toEqual(['search_path=""'])
  })

  // Misurato: con l intervallo rovesciato le tre sezioni che hanno un
  // predicato sulle date si svuotano, e `weekly` NO — non ne ha uno, perché la
  // settimana tipica non ha date. Il chiamante su un intervallo rovesciato
  // scandisce zero giorni, quindi non fa danno; l asserzione dice il vero
  // invece di promettere un documento interamente vuoto.
  it('svuota le sezioni datate quando l intervallo è rovesciato', async () => {
    await asOwner((c) =>
      c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      ),
    )
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18)
    const w = await finestra('2026-04-08', DAY_ONE, [VERA])
    expect(w.occupancy).toEqual([])
    expect(w.exceptions).toEqual([])
    expect(w.closures).toEqual([])
    expect(w.weekly).toHaveLength(1)
  })

  // ⚠ discriminante: una data NULLA deve fallire CHIUSA. Misurato sulla
  // revisione precedente di questo piano: falliva APERTA — `closures` si
  // svuotava e `weekly` restava pieno, cioè il documento diceva «l operatrice
  // lavora, il salone non è mai chiuso, niente è prenotato». È la forma
  // peggiore possibile, ed è lo stesso principio che D2-8 applica alle
  // operatrici: un errore del chiamante produce il vuoto, non la
  // disponibilità massima.
  it('restituisce un documento vuoto quando una delle due date è nulla', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      )
      await c.query(
        `insert into salon_closure (start_date, end_date, from_boundary, to_boundary, reason)
         values ('2026-03-01', '2026-03-31', null, null, 'Ferie')`,
      )
    })
    const coppie: Array<[string | null, string | null]> = [
      [null, DAY_ONE],
      [DAY_ONE, null],
      [null, null],
    ]
    for (const [da, a] of coppie) {
      const w = await asOperator(VERA_AUTH, async (c) => {
        const r = await c.query<{ w: Record<string, unknown[]> }>(
          'select public.availability_window($1::date, $2::date, $3::uuid[]) as w',
          [da, a, [VERA]],
        )
        return r.rows[0].w
      })
      expect(w.weekly).toEqual([])
      expect(w.exceptions).toEqual([])
      expect(w.closures).toEqual([])
      expect(w.occupancy).toEqual([])
    }
  })
})
