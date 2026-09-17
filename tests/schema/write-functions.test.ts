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

  it('is callable by the application role', async () => {
    const seen = await asOperator(VERA_AUTH, async (c) => {
      await c.query('select move_visit($1, $2::date, $3)', [V1, DAY_ONE, 6])
      const r = await c.query<{ s: number }>(
        'select start_cell as s from appointment where visit_id = $1 order by start_cell',
        [V1],
      )
      return r.rows.map((x) => x.s)
    })
    expect(seen).toEqual([126, 138])
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

  it('raises P0002, not a silent success, when the caller cannot see the visit', async () => {
    // OUTSIDER_AUTH is an authenticated account linked to no operator row,
    // so app.is_active_operator() is false and RLS hides V1 entirely.
    await expect(
      asOperator(OUTSIDER_AUTH, (c) => c.query('select move_visit($1, $2::date, $3)', [V1, DAY_ONE, 6])),
    ).rejects.toSatisfy((e) => pgCode(e) === 'P0002')
  })
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
  const SIGNATURES: [string, string][] = [
    ['public.move_visit(uuid, date, integer)', 'move_visit(null, null, null)'],
    ['public.swap_appointment_operators(uuid, uuid)', 'swap_appointment_operators(null, null)'],
    ['public.write_exception_day(uuid, date, int[])', 'write_exception_day(null, null, null)'],
    ['public.write_exception_days(uuid, date, date, int[])', 'write_exception_days(null, null, null, null)'],
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
  it.each(SIGNATURES)('anon lacks EXECUTE on %s', async (signature) => {
    expect(await hasExecute('anon', signature)).toBe(false)
  })

  it.each(SIGNATURES)('authenticated has EXECUTE on %s', async (signature) => {
    expect(await hasExecute('authenticated', signature)).toBe(true)
  })

  it.each(SIGNATURES)('refuses %s to an unauthenticated caller', async (_signature, call) => {
    await expect(asAnon((c) => c.query(`select ${call}`))).rejects.toSatisfy((e) => pgCode(e) === '42501')
  })
})
