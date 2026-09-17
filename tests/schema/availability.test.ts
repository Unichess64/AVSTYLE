import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { DAY_ONE, seedFixture } from '../helpers/fixtures'

const EXC = '70000000-0000-4000-8000-000000000001'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const count = (table: string) =>
  asOperator(VERA_AUTH, async (c) => (await c.query(`select 1 from ${table}`)).rowCount)

const addWeekly = (operator: string, weekday: number, s: number, e: number) =>
  asOwner((c) =>
    c.query(
      `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary) values ($1, $2, $3, $4)`,
      [operator, weekday, s, e],
    ),
  )

describe('weekly availability', () => {
  it('stores a split shift as two ranges', async () => {
    // Thursday: isodow 4 - 1 = 3. 09:00-13:00 and 15:00-19:00.
    await addWeekly(VERA, 3, 108, 156)
    await addWeekly(VERA, 3, 180, 228)
    expect(await count('weekly_availability')).toBe(2)
  })

  it('accepts two touching ranges: folding is the resolver s job', async () => {
    await addWeekly(VERA, 3, 108, 144)
    await addWeekly(VERA, 3, 144, 180)
    expect(await count('weekly_availability')).toBe(2)
  })

  it('refuses two overlapping ranges for one operator and weekday', async () => {
    await addWeekly(VERA, 3, 108, 156)
    await expect(addWeekly(VERA, 3, 150, 200)).rejects.toSatisfy((e) => pgCode(e) === '23P01')
  })

  // ⚠ discriminating for the operator_id and weekday keys of the exclusion
  // constraint: with one operator and one weekday in play, a constraint that
  // ignored them would look identical.
  it('accepts the same range for a different operator', async () => {
    await addWeekly(VERA, 3, 108, 156)
    await addWeekly(ANNALISA, 3, 108, 156)
    expect(await count('weekly_availability')).toBe(2)
  })

  it('accepts the same range on a different weekday', async () => {
    await addWeekly(VERA, 3, 108, 156)
    await addWeekly(VERA, 4, 108, 156)
    expect(await count('weekly_availability')).toBe(2)
  })

  it.each([
    ['an end boundary beyond the day', 108, 400],
    ['an inverted range', 200, 100],
  ])('refuses %s', async (_l, s, e) => {
    await expect(addWeekly(VERA, 3, s, e)).rejects.toSatisfy((err) => pgCode(err) === '23514')
  })

  it('refuses a weekday outside Monday..Sunday', async () => {
    await expect(addWeekly(VERA, 7, 108, 156)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })
})

describe('exception days', () => {
  const addDay = () =>
    asOwner((c) =>
      c.query('insert into exception_day (id, operator_id, exception_date) values ($1, $2, $3::date)', [
        EXC, VERA, DAY_ONE,
      ]),
    )
  const addRange = (s: number, e: number) =>
    asOwner((c) =>
      c.query('insert into exception_range (exception_day_id, start_boundary, end_boundary) values ($1, $2, $3)', [
        EXC, s, e,
      ]),
    )

  it('holds at most one exception per operator and date', async () => {
    await addDay()
    await expect(
      asOwner((c) =>
        c.query('insert into exception_day (operator_id, exception_date) values ($1, $2::date)', [VERA, DAY_ONE]),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505')
  })

  it('allows the same date for a different operator', async () => {
    await addDay()
    await asOwner((c) =>
      c.query('insert into exception_day (operator_id, exception_date) values ($1, $2::date)', [ANNALISA, DAY_ONE]),
    )
    expect(await count('exception_day')).toBe(2)
  })

  it('treats an exception day with no ranges as away', async () => {
    await addDay()
    expect(await count('exception_range')).toBe(0)
  })

  it('refuses overlapping ranges within one exception day', async () => {
    await addDay()
    await addRange(180, 204)
    await expect(addRange(190, 220)).rejects.toSatisfy((e) => pgCode(e) === '23P01')
  })

  it('refuses an exception range beyond the day', async () => {
    await addDay()
    await expect(addRange(0, 30000)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('removes the ranges with the exception day', async () => {
    await addDay()
    await addRange(180, 204)
    await asOwner((c) => c.query('delete from exception_day where id = $1', [EXC]))
    expect(await count('exception_range')).toBe(0)
  })
})

describe('salon closures', () => {
  // NOTE: every negative case below supplies `reason`. Omitting it raises
  // 23502 (not-null) BEFORE the check constraints, so the test would fail on a
  // typo while the constraint under test stayed unmeasured.
  const close = (sql: string) => asOwner((c) => c.query(`insert into salon_closure ${sql}`))

  it('stores a whole-day closure spanning a fortnight', async () => {
    await close(`(start_date, end_date, reason) values (date '2026-08-10', date '2026-08-24', 'Ferie')`)
    const r = await asOperator(VERA_AUTH, async (c) => {
      const q = await c.query<{ r: string }>('select reason as r from salon_closure')
      return q.rows[0].r
    })
    expect(r).toBe('Ferie')
  })

  // Spec §6.5 builds this deliberately. §13.2 had listed it as something to
  // reject; §6.5 is the side that is right, and the spec was corrected.
  it('stores a partial closure across several dates', async () => {
    await close(
      `(start_date, end_date, from_boundary, to_boundary, reason)
       values (date '2026-12-24', date '2026-12-25', 156, 288, 'Chiusura pomeridiana')`,
    )
    expect(await count('salon_closure')).toBe(1)
  })

  it.each([
    ['one boundary without the other', `(start_date, end_date, from_boundary, reason) values (date '2026-12-24', date '2026-12-24', 156, 'x')`],
    ['an inverted window', `(start_date, end_date, from_boundary, to_boundary, reason) values (date '2026-12-24', date '2026-12-24', 200, 100, 'x')`],
    ['a boundary beyond the day', `(start_date, end_date, from_boundary, to_boundary, reason) values (date '2026-12-24', date '2026-12-24', 100, 400, 'x')`],
    ['an end date before the start date', `(start_date, end_date, reason) values (date '2026-08-24', date '2026-08-10', 'x')`],
  ])('refuses %s', async (_l, sql) => {
    await expect(close(sql)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })
})
