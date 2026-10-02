import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANNALISA,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOwner,
  connect,
  pgCode,
  resetData,
} from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const V1 = '50000000-0000-4000-8000-000000000001'
const V2 = '50000000-0000-4000-8000-000000000002'
const A1 = '60000000-0000-4000-8000-000000000001'
const A2 = '60000000-0000-4000-8000-000000000002'
const A3 = '60000000-0000-4000-8000-000000000003'
// Neither id is ever inserted by beforeEach: real UUID shape, guaranteed absent.
const MISSING_VISIT = '50000000-0000-4000-8000-00000000ffff'
const MISSING_APPOINTMENT = '60000000-0000-4000-8000-00000000ffff'

beforeEach(async () => {
  await resetData()
  await seedFixture()
  await asOwner(async (c) => {
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V1, CLIENT_MARIA, DAY_ONE])
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V2, CLIENT_LUCIA, DAY_ONE])
    // Vera: manicure 120-131 and pedicure 132-143 in one visit.
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 12), ($6, $2, $3, $4, $5::date, 132, 12)`,
      [A1, V1, VERA, SERVICE_REFILL, DAY_ONE, A2],
    )
    // Annalisa: the same cells as the manicure, different visit.
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 12)`,
      [A3, V2, ANNALISA, SERVICE_REFILL, DAY_ONE],
    )
  })
})

const startsOf = (visit: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ s: number }>(
      'select start_cell as s from appointment where visit_id = $1 order by start_cell',
      [visit],
    )
    return r.rows.map((x) => x.s)
  })

describe('move_visit', () => {
  // ⚠ discriminating: THE case that fails as two separate calls.
  it('shifts a two-service visit by 30 minutes in one transaction', async () => {
    await asOwner((c) => c.query('select move_visit($1, $2::date, $3)', [V1, DAY_ONE, 6]))
    expect(await startsOf(V1)).toEqual([126, 138])
  })

  // Sostituisce «is callable by the application role», che la 0020 rende
  // impossibile. Convertirla a `asOwner` invece che sostituirla ne avrebbe
  // fatto un doppione esatto di «shifts a two-service visit by 30 minutes»
  // qui sopra: stessa chiamata, stessa imbracatura, stesso atteso.
  //
  // ⚠︎ Questa prova NON è il presidio della revoca, e chi legge non la tratti
  // come tale: `42501` è anche ciò che risponde una sessione morta in cache o
  // un'imbracatura rotta, quindi resterebbe verde per il motivo sbagliato. Il
  // presidio della 0020 è la prova nominativa in fondo al file — «authenticated
  // non ha più EXECUTE su public.move_visit(uuid, date, integer)» — che
  // interroga il PERMESSO invece del comportamento.
  it('non è più chiamabile da un operatrice: il 3a usa sposta_visita_a', async () => {
    const codiceErrore = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('select move_visit($1, $2::date, 6)', [V1, DAY_TWO])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('42501')
  })

  it('moves a whole visit to another date', async () => {
    await asOwner((c) => c.query('select move_visit($1, $2::date, 0)', [V1, DAY_TWO]))
    const dates = await asOwner(async (c) => {
      const r = await c.query<{ d: string }>(
        'select distinct appointment_date as d from appointment where visit_id = $1',
        [V1],
      )
      return r.rows.map((x) => x.d)
    })
    expect(dates).toEqual([DAY_TWO])
  })

  // ⚠ discriminating: proves the closing `SET CONSTRAINTS` names
  // appointment_slot_unique rather than ALL. `ALL` also un-defers
  // zz_touch_client_activity (0007_client_activity.sql), so the client's
  // last_activity_at would already reflect the move BEFORE this transaction
  // commits — invisible to a test that only reads the post-commit value,
  // which is why this test reads it from inside the still-open transaction
  // too. CLIENT_MARIA's last_activity_at is DAY_ONE going in: her only
  // appointments (inserted by beforeEach, each its own autocommit) are on
  // DAY_ONE, and the deferred activity trigger already fired for them.
  it('leaves last_activity_at deferred to commit across a move_visit call', async () => {
    const c = await connect()
    try {
      await c.query('begin')
      const before = await c.query<{ d: string }>(
        'select last_activity_at as d from client where id = $1',
        [CLIENT_MARIA],
      )
      expect(before.rows[0].d).toBe(DAY_ONE)

      await c.query('select move_visit($1, $2::date, 0)', [V1, DAY_TWO])

      // Still the OLD value: zz_touch_client_activity is deferred, and
      // `SET CONSTRAINTS appointment_slot_unique IMMEDIATE` inside
      // move_visit must not touch it.
      const insideTx = await c.query<{ d: string }>(
        'select last_activity_at as d from client where id = $1',
        [CLIENT_MARIA],
      )
      expect(insideTx.rows[0].d).toBe(DAY_ONE)

      await c.query('commit')
    } finally {
      await c.query('rollback').catch(() => {})
      await c.end()
    }

    // The NEW value, now that the deferred trigger has fired at commit.
    const after = await asOwner(async (owner) => {
      const r = await owner.query<{ d: string }>(
        'select last_activity_at as d from client where id = $1',
        [CLIENT_MARIA],
      )
      return r.rows[0].d
    })
    expect(after).toBe(DAY_TWO)
  })

  // ⚠ discriminating for `set constraints all immediate`: inside an EXPLICIT
  // transaction the deferred constraint would otherwise stay silent until
  // commit. Under autocommit both behaviours look identical.
  it('reports a collision inside the transaction, not at commit', async () => {
    const c = await connect()
    try {
      await c.query('begin')
      // Park a Vera appointment on cells 144-155, where the visit's pedicure
      // lands once the visit shifts by an hour.
      await c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 144, 12)`,
        [V2, VERA, SERVICE_REFILL, DAY_ONE],
      )
      // Shift V1 by 12 cells: manicure 120->132, pedicure 132->144. Collision.
      await expect(c.query('select move_visit($1, $2::date, 12)', [V1, DAY_ONE])).rejects.toSatisfy(
        (e) => pgCode(e) === '23505',
      )
    } finally {
      await c.query('rollback').catch(() => {})
      await c.end()
    }
  })

  // ⚠ discriminating: fix round 1. Without the entry-point
  // `set constraints appointment_slot_unique deferred`, a second move_visit
  // call in the SAME explicit transaction inherits IMMEDIATE mode from the
  // first call's own trailing `set constraints all immediate`. A single-
  // appointment visit can't expose that (nothing else in the same UPDATE
  // statement to transiently collide with), so V2 is given a SECOND
  // appointment here — the same "manicure passes through where the pedicure
  // currently sits" shape as V1's own two-service shift — before shifting
  // it as the transaction's second call.
  it('allows two non-colliding move_visit calls in the same explicit transaction', async () => {
    const c = await connect()
    try {
      await c.query('begin')
      // Give V2 a second appointment, mirroring V1's own two-service shape,
      // so its own shift below is a multi-row UPDATE too.
      await c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 132, 12)`,
        [V2, ANNALISA, SERVICE_REFILL, DAY_ONE],
      )
      await c.query('select move_visit($1, $2::date, $3)', [V1, DAY_ONE, 6])
      await c.query('select move_visit($1, $2::date, $3)', [V2, DAY_ONE, 6])
      const v1 = await c.query<{ s: number }>(
        'select start_cell as s from appointment where visit_id = $1 order by start_cell',
        [V1],
      )
      const v2 = await c.query<{ s: number }>(
        'select start_cell as s from appointment where visit_id = $1 order by start_cell',
        [V2],
      )
      expect(v1.rows.map((x) => x.s)).toEqual([126, 138])
      expect(v2.rows.map((x) => x.s)).toEqual([126, 138])
    } finally {
      await c.query('rollback').catch(() => {})
      await c.end()
    }
  })

  // ⚠ discriminating: fix round 1, silent no-ops. Without the FOUND check,
  // both of these resolve with no error and no change — indistinguishable
  // from a real success.
  it('raises P0002 for a visit that does not exist', async () => {
    await expect(
      asOwner((c) => c.query('select move_visit($1, $2::date, $3)', [MISSING_VISIT, DAY_ONE, 6])),
    ).rejects.toSatisfy((e) => pgCode(e) === 'P0002')
  })

  // ⛔ QUI C'ERA «raises P0002, not a silent success, when the caller cannot
  // see the visit», e la 0020 l'ha resa IMPOSSIBILE. È una perdita dichiarata,
  // non una pulizia: si scrive qui perché un file che tace su ciò che ha perso
  // lascia credere di presidiare ancora quel ramo.
  //
  // Che cosa presidiava: «move_visit solleva P0002 invece di non far niente in
  // silenzio, quando la sicurezza per riga nasconde la visita a CHI CHIAMA».
  // Chiamava da asOperator(OUTSIDER_AUTH) — un conto authenticated legato a
  // nessuna operatrice — e dopo la revoca quella chiamata riceve 42501 prima
  // ancora di entrare nella funzione.
  //
  // Perché non è stata riscritta: l'unico caso che il PROPRIETARIO può ancora
  // raggiungere è «la visita non esiste», ed è esattamente la prova qui sopra.
  // Riscriverla così sarebbe stato un doppione verde al posto di un presidio.
  // E il ramo non ha più NESSUN chiamante capace di esercitarlo: asOwner
  // scavalca la sicurezza per riga, quindi da proprietario la visita è sempre
  // visibile, e dopo la 0020 nessun ruolo soggetto alla RLS ha più EXECUTE.
  //
  // Il numero, misurato il 30/09/2026 (sonda: via il `raise … P0002` dal
  // controllo FOUND di move_visit in 0010, db reset, suite intera):
  //   • PRIMA della 0020: 2 rosse — questa e «raises P0002 for a visit that
  //     does not exist».
  //   • DOPO  della 0020: 1 rossa — resta solo quella.
  // Cioè la revoca spegne esattamente UN rivelatore, e il controllo FOUND
  // resta comunque piantato. La metà che si perde è quella sulla INVISIBILITÀ
  // per riga, non quella sull'assenza.
})

describe('swap_appointment_operators', () => {
  it('swaps two appointments that occupy the same cells', async () => {
    await asOwner((c) => c.query('select swap_appointment_operators($1, $2)', [A1, A3]))
    const owners = await asOwner(async (c) => {
      const r = await c.query<{ id: string; o: string }>(
        'select id, operator_id as o from appointment where id = any($1)',
        [[A1, A3]],
      )
      return Object.fromEntries(r.rows.map((x) => [x.id, x.o]))
    })
    expect(owners[A1]).toBe(ANNALISA)
    expect(owners[A3]).toBe(VERA)
  })

  // ⚠ discriminating: the same swap as two separate calls must fail. This is
  // the measurement behind D29.
  it('cannot be done as two separate calls', async () => {
    await expect(
      asOwner((c) => c.query('update appointment set operator_id = $1 where id = $2', [ANNALISA, A1])),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505')
  })

  // ⚠ discriminating: fix round 1. The autocommit swap test above passes
  // with or without `set constraints all immediate` (nothing forces the
  // deferred check before this test's own inspecting query runs), and
  // "cannot be done as two separate calls" only proves the SCHEMA's deferred
  // constraint, not that the function itself checks anything — it stays
  // green even if swap_appointment_operators is deleted outright. This test
  // fails unless the FUNCTION checks inside its own transaction: it parks a
  // fresh, UNCOMMITTED third appointment that only collides with where one
  // swapped appointment lands, on the SAME connection, before commit.
  it('reports a collision inside the transaction, not at commit', async () => {
    const c = await connect()
    try {
      await c.query('begin')
      const b1 = (
        await c.query<{ id: string }>(
          `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
           values ($1, $2, $3, $4::date, 200, 12) returning id`,
          [V1, VERA, SERVICE_REFILL, DAY_ONE],
        )
      ).rows[0].id
      const b2 = (
        await c.query<{ id: string }>(
          `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
           values ($1, $2, $3, $4::date, 220, 12) returning id`,
          [V2, ANNALISA, SERVICE_REFILL, DAY_ONE],
        )
      ).rows[0].id
      // Park a third, uncommitted Annalisa appointment on cells 200-211,
      // where b1 lands once it becomes Annalisa's.
      await c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 200, 12)`,
        [V2, ANNALISA, SERVICE_REFILL, DAY_ONE],
      )
      // Swap b1 (Vera, 200-211) and b2 (Annalisa, 220-231): b1 becomes
      // Annalisa on 200-211. Collision with the parked appointment above.
      await expect(c.query('select swap_appointment_operators($1, $2)', [b1, b2])).rejects.toSatisfy(
        (e) => pgCode(e) === '23505',
      )
    } finally {
      await c.query('rollback').catch(() => {})
      await c.end()
    }
  })

  // ⚠ discriminating: fix round 1, silent no-ops.
  it('raises P0002 when an appointment does not exist', async () => {
    await expect(
      asOwner((c) => c.query('select swap_appointment_operators($1, $2)', [A1, MISSING_APPOINTMENT])),
    ).rejects.toSatisfy((e) => pgCode(e) === 'P0002')
  })

  it('raises P0002, not a silent success, when the caller cannot see an appointment', async () => {
    await expect(
      asOperator(OUTSIDER_AUTH, (c) => c.query('select swap_appointment_operators($1, $2)', [A1, A3])),
    ).rejects.toSatisfy((e) => pgCode(e) === 'P0002')
  })

  // La gemella positiva di quella sopra: stessa funzione, stessi appuntamenti,
  // stessa imbracatura, un'operatrice attiva. Il P0002 di sopra nasce dal fatto
  // che la sicurezza per riga nasconde A1 e A3, e lo solleverebbe anche una
  // sessione morta in cache: senza questa prova, quel `rejects` resterebbe
  // verde con l'imbracatura rotta (misurato col Task 3).
  it('swaps them for an active operator, with the same harness', async () => {
    const owners = await asOperator(VERA_AUTH, async (c) => {
      await c.query('select swap_appointment_operators($1, $2)', [A1, A3])
      const r = await c.query<{ id: string; o: string }>(
        'select id, operator_id as o from appointment where id = any($1) order by id',
        [[A1, A3]],
      )
      return r.rows.map((x) => x.o)
    })
    expect(owners).toEqual([ANNALISA, VERA])
  })
})

describe('write_exception_day', () => {
  const rangesOf = (dayId: string) =>
    asOwner(async (c) => {
      const r = await c.query<{ s: number; e: number }>(
        'select start_boundary as s, end_boundary as e from exception_range where exception_day_id = $1 order by s',
        [dayId],
      )
      return r.rows
    })

  it('writes the day and its ranges together', async () => {
    const id = await asOwner(async (c) => {
      const r = await c.query<{ id: string }>(`select write_exception_day($1, $2::date, array[[180, 204]]) as id`, [
        VERA, DAY_ONE,
      ])
      return r.rows[0].id
    })
    expect(await rangesOf(id)).toEqual([{ s: 180, e: 204 }])
  })

  it.each([
    ['null', null],
    ['an empty array', '{}'],
  ])('writes an absence when the ranges are %s', async (_l, ranges) => {
    const id = await asOwner(async (c) => {
      const r = await c.query<{ id: string }>(`select write_exception_day($1, $2::date, $3::int[]) as id`, [
        VERA, DAY_ONE, ranges,
      ])
      return r.rows[0].id
    })
    expect(await rangesOf(id)).toEqual([])
  })

  it('replaces the previous exception for the same date', async () => {
    await asOwner((c) => c.query(`select write_exception_day($1, $2::date, array[[180, 204]])`, [VERA, DAY_ONE]))
    const id = await asOwner(async (c) => {
      const r = await c.query<{ id: string }>(`select write_exception_day($1, $2::date, array[[108, 156]]) as id`, [
        VERA, DAY_ONE,
      ])
      return r.rows[0].id
    })
    expect(await rangesOf(id)).toEqual([{ s: 108, e: 156 }])
  })

  // ⚠ discriminating: atomicity. A bad range must leave neither the day nor
  // the ranges — otherwise a half-written call marks the operator away all day,
  // indistinguishable from a deliberate absence.
  it('leaves nothing behind when a range is invalid', async () => {
    await expect(
      asOwner((c) => c.query(`select write_exception_day($1, $2::date, array[[180, 30000]])`, [VERA, DAY_ONE])),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
    const n = await asOwner(async (c) => (await c.query('select 1 from exception_day')).rowCount)
    expect(n).toBe(0)
  })

  it('writes a fortnight of absence in one call', async () => {
    const written = await asOwner(async (c) => {
      const r = await c.query<{ n: number }>(
        `select write_exception_days($1, date '2026-08-10', date '2026-08-23', null) as n`,
        [VERA],
      )
      return r.rows[0].n
    })
    expect(written).toBe(14)
  })
})

describe('write function privileges', () => {
  // Canonical signatures, as `has_function_privilege` resolves them —
  // matching the revoke/grant block's own spelling in the migration.
  // ⚠︎ L'elenco è spaccato in due dalla 0020, e NON riducendolo a tre: togliere
  // e basta la riga di move_visit è la correzione che viene naturale davanti
  // alla rossa, e cancellerebbe IN SILENZIO anche i due presidi su `anon` che
  // vivono nello stesso elenco.
  //
  // Le tre che authenticated può ancora chiamare dopo la 0020.
  const SIGNATURES_VIVE: [string, string][] = [
    ['public.swap_appointment_operators(uuid, uuid)', 'swap_appointment_operators(null, null)'],
    ['public.write_exception_day(uuid, date, int[])', 'write_exception_day(null, null, null)'],
    ['public.write_exception_days(uuid, date, date, int[])', 'write_exception_days(null, null, null, null)'],
  ]
  // Tutte e quattro: anon non deve poterne chiamare nessuna, move_visit compresa.
  const SIGNATURES: [string, string][] = [
    ['public.move_visit(uuid, date, integer)', 'move_visit(null, null, null)'],
    ...SIGNATURES_VIVE,
  ]

  const hasExecute = (role: 'anon' | 'authenticated', signature: string) =>
    asOwner(async (c) => {
      const r = await c.query<{ has: boolean }>(`select has_function_privilege($1, $2, 'EXECUTE') as has`, [
        role,
        signature,
      ])
      return r.rows[0].has
    })

  // ⚠ discriminating: fix round 1. "Call as anon, expect 42501" cannot tell
  // "EXECUTE revoked from the function" apart from "EXECUTE granted, but the
  // function body then hits a revoked TABLE privilege or an RLS policy" —
  // both also raise 42501. Measured live: granting EXECUTE to anon on all
  // four left move_visit and swap_appointment_operators still raising 42501
  // (from the table grants 00051_privilege_baseline.sql revokes from anon)
  // and write_exception_day still raising 42501 (from its RLS policy, once
  // it actually attempts the insert) — three of the four behavioural tests
  // below stayed green with EXECUTE wrongly granted, unable to fail.
  // has_function_privilege checks the EXECUTE grant itself, directly, so it
  // cannot be fooled by what happens deeper inside the function.
  // ⚠︎ IL presidio degli ELENCHI STESSI, e l'unico che li veda.
  //
  // Togliere una riga da `SIGNATURES` non dà nessuna rossa: abbassa solo il
  // denominatore, in silenzio. Misurato il 30/09/2026, togliendo `move_visit`:
  // 31 → 29 prove, ZERO rosse. Ed è la correzione che viene naturale davanti
  // alla rossa della 0020 — e le due righe che sparirebbero NON sono doppioni:
  // `grant execute on function public.move_visit(uuid, date, integer) to public`
  // fa arrossire 3 prove, fra cui *anon lacks EXECUTE on public.move_visit(…)*.
  // Quel presidio è vivo, e la correzione naturale lo spegne.
  //
  // Si pianta per NOME e non con `toHaveLength(4)`: la lunghezza non vede una
  // voce SOSTITUITA con un doppione (misurato: doppiando write_exception_day al
  // posto di write_exception_days, zero rosse e `write_exception_days` non più
  // provata da nessuna parte), e non vede affatto il SECONDO elemento della
  // tupla — la forma di CHIAMATA, che *refuses %s to an unauthenticated caller*
  // esegue letteralmente. Una chiamata con un argomento in meno darebbe 42883
  // invece di 42501, e quella prova arrossirebbe per il motivo sbagliato.
  //
  // Non ha `beforeEach`: è puramente sintattica, non tocca il database.
  it('tiene i due elenchi delle firme pinnati per nome, non per lunghezza', () => {
    expect(SIGNATURES.map(([s]) => s)).toEqual([
      'public.move_visit(uuid, date, integer)',
      'public.swap_appointment_operators(uuid, uuid)',
      'public.write_exception_day(uuid, date, int[])',
      'public.write_exception_days(uuid, date, date, int[])',
    ])
    expect(SIGNATURES_VIVE.map(([s]) => s)).toEqual([
      'public.swap_appointment_operators(uuid, uuid)',
      'public.write_exception_day(uuid, date, int[])',
      'public.write_exception_days(uuid, date, date, int[])',
    ])
    expect(SIGNATURES.map(([, chiamata]) => chiamata)).toEqual([
      'move_visit(null, null, null)',
      'swap_appointment_operators(null, null)',
      'write_exception_day(null, null, null)',
      'write_exception_days(null, null, null, null)',
    ])
  })

  it.each(SIGNATURES)('anon lacks EXECUTE on %s', async (signature) => {
    expect(await hasExecute('anon', signature)).toBe(false)
  })

  it.each(SIGNATURES_VIVE)('authenticated has EXECUTE on %s', async (signature) => {
    expect(await hasExecute('authenticated', signature)).toBe(true)
  })

  // ⚠︎ IL presidio della 0020, e l'unico che sappia arrossire su di lei.
  //
  // Le due prove sopravvissute su move_visit non discriminano più niente sulla
  // revoca: «anon lacks EXECUTE» era già false prima (0010 la revoca ad anon
  // dal primo giorno), e «refuses … to an unauthenticated caller» resta verde
  // perché `anon` prendeva già 42501. Serve l'asserzione POSITIVA rovesciata su
  // authenticated, che è la sola capace di passare da true a false quando la
  // 0020 sparisce.
  it('authenticated non ha più EXECUTE su public.move_visit(uuid, date, integer)', async () => {
    expect(await hasExecute('authenticated', 'public.move_visit(uuid, date, integer)')).toBe(false)
  })

  it.each(SIGNATURES)('refuses %s to an unauthenticated caller', async (_signature, call) => {
    await expect(asAnon((c) => c.query(`select ${call}`))).rejects.toSatisfy((e) => pgCode(e) === '42501')
  })
})
