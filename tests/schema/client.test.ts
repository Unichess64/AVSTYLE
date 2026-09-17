import { beforeEach, describe, expect, it } from 'vitest'
import { OUTSIDER_AUTH, VERA, VERA_AUTH, asAnon, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, seedFixture } from '../helpers/fixtures'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const add = (fields: string) => asOwner((c) => c.query(`insert into client ${fields}`))

describe('client', () => {
  it('accepts a client with no birthday at all', async () => {
    await add(`(full_name, phone) values ('Senza data', '+393330000000')`)
    const n = await asOperator(VERA_AUTH, async (c) => (await c.query('select id from client')).rowCount)
    expect(n).toBe(3) // two from the fixture plus this one
  })

  it('refuses a month without a day', async () => {
    await expect(add(`(full_name, birth_month) values ('Mezza data', 3)`)).rejects.toSatisfy(
      (e) => pgCode(e) === '23514',
    )
  })

  it('refuses a day without a month', async () => {
    await expect(add(`(full_name, birth_day) values ('Mezza data', 12)`)).rejects.toSatisfy(
      (e) => pgCode(e) === '23514',
    )
  })

  it('accepts 29 February', async () => {
    await add(`(full_name, birth_month, birth_day) values ('Bisestile', 2, 29)`)
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: number }>(`select birth_day as d from client where full_name = 'Bisestile'`)
      return r.rows[0].d
    })
    expect(d).toBe(29)
  })

  // Must REJECT, not raise: a date-construction check raises 22008, which no
  // form can handle. Spec §6.2.1.
  it.each([
    ['31 February', 2, 31],
    ['31 April', 4, 31],
  ])('rejects %s with a check violation, not an error', async (_l, m, d) => {
    await expect(
      add(`(full_name, birth_month, birth_day) values ('Impossibile', ${m}, ${d})`),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('stores last_activity_at as a date, not a timestamp', async () => {
    const t = await asOwner(async (c) => {
      const r = await c.query<{ t: string }>(`
        select data_type as t from information_schema.columns
        where table_name = 'client' and column_name = 'last_activity_at'
      `)
      return r.rows[0].t
    })
    expect(t).toBe('date')
  })

  it('records a preferred operator and a message opt-out', async () => {
    await asOwner((c) =>
      c.query('update client set preferred_operator_id = $1, no_messages = true where id = $2', [VERA, CLIENT_MARIA]),
    )
    const row = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ p: string; m: boolean }>(
        'select preferred_operator_id as p, no_messages as m from client where id = $1',
        [CLIENT_MARIA],
      )
      return r.rows[0]
    })
    expect(row).toEqual({ p: VERA, m: true })
  })

  // The insert-then-delete of the temporary operator runs inside one
  // transaction: without it, an interruption between the two statements
  // (asOwner opens a fresh, non-transactional connection per call) could
  // leave TEMP committed as a genuine fourth operator, which would
  // permanently redden access-control.test.ts's *"seeds exactly three
  // operators with the expected ids"* for every later run against this
  // database until manually cleaned up.
  it('clears the preferred operator when that operator row is deleted', async () => {
    const TEMP = '10000000-0000-4000-8000-000000000009'
    await asOwner(async (c) => {
      await c.query('begin')
      try {
        await c.query(`insert into operator (id, name, color) values ($1, 'Temp', '#000000')`, [TEMP])
        await c.query('update client set preferred_operator_id = $1 where id = $2', [TEMP, CLIENT_MARIA])
        await c.query('delete from operator where id = $1', [TEMP])
        await c.query('commit')
      } catch (e) {
        await c.query('rollback').catch(() => {})
        throw e
      }
    })
    const p = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ p: string | null }>(
        'select preferred_operator_id as p from client where id = $1',
        [CLIENT_MARIA],
      )
      return r.rows[0].p
    })
    expect(p).toBeNull()
  })

  it('finds a client whose name differs by accent and case', async () => {
    const found = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string }>(
        `select full_name as n from client
         where immutable_unaccent(full_name) ilike '%' || immutable_unaccent($1) || '%'`,
        ['ciccare'],
      )
      return r.rows.map((x) => x.n)
    })
    expect(found).toEqual(['Lucia Ciccarè'])
  })
})

describe('access control on client', () => {
  it('hides client data from an authenticated account that is not an operator', async () => {
    const n = await asOperator(OUTSIDER_AUTH, async (c) => (await c.query('select id from client')).rowCount)
    expect(n).toBe(0)
  })

  it('hides client data from an unauthenticated visitor', async () => {
    const n = await asAnon(async (c) => (await c.query('select id from client')).rowCount)
    expect(n).toBe(0)
  })
})
