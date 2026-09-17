import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, VERA, VERA_AUTH, asAnon, asOperator, asOwner, connect, pgCode, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const V1 = '50000000-0000-4000-8000-000000000001'
const V2 = '50000000-0000-4000-8000-000000000002'
const A1 = '60000000-0000-4000-8000-000000000001'
const A2 = '60000000-0000-4000-8000-000000000002'
const A3 = '60000000-0000-4000-8000-000000000003'

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
  it.each([
    'move_visit(null, null, null)',
    'swap_appointment_operators(null, null)',
    'write_exception_day(null, null, null)',
    'write_exception_days(null, null, null, null)',
  ])('refuses %s to an unauthenticated caller', async (call) => {
    await expect(asAnon((c) => c.query(`select ${call}`))).rejects.toSatisfy((e) => pgCode(e) === '42501')
  })
})
