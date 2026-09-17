import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CAT_NAILS, SERVICE_MASSAGE, SERVICE_REFILL, seedCatalogue } from '../helpers/fixtures'

beforeEach(async () => {
  await resetData()
  await seedCatalogue()
})

describe('catalogue', () => {
  it('stores durations in cells', async () => {
    const rows = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string; d: number }>(
        'select name as n, default_duration_cells as d from service order by name',
      )
      return r.rows
    })
    expect(rows).toEqual([
      { n: 'Massaggio', d: 10 },   // 50 minutes
      { n: 'Refill gel', d: 18 },  // 90 minutes
    ])
  })

  it('refuses a service with a non-positive duration', async () => {
    await expect(
      asOwner((c) =>
        c.query(`insert into service (name, category_id, default_duration_cells) values ('Nulla', $1, 0)`, [CAT_NAILS]),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses a negative turnaround', async () => {
    await expect(
      asOwner((c) =>
        c.query(
          `insert into service (name, category_id, default_duration_cells, buffer_after_cells)
           values ('Negativo', $1, 6, -1)`,
          [CAT_NAILS],
        ),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses a per-operator duration override of zero', async () => {
    await expect(
      asOwner((c) =>
        c.query(`insert into operator_service (operator_id, service_id, duration_cells) values ($1, $2, 0)`, [
          VERA, SERVICE_MASSAGE,
        ]),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('leaves the override null so the service default applies', async () => {
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: number | null }>(
        'select duration_cells as d from operator_service where operator_id = $1 and service_id = $2',
        [VERA, SERVICE_REFILL],
      )
      return r.rows[0].d
    })
    expect(d).toBeNull()
  })

  it('accepts a per-operator override: Annalisa is slower than Vera', async () => {
    await asOwner((c) =>
      c.query('update operator_service set duration_cells = 24 where operator_id = $1 and service_id = $2', [
        ANNALISA, SERVICE_REFILL,
      ]),
    )
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: number }>(
        'select duration_cells as d from operator_service where operator_id = $1 and service_id = $2',
        [ANNALISA, SERVICE_REFILL],
      )
      return r.rows[0].d
    })
    expect(d).toBe(24) // 120 minutes against Vera's 90
  })

  it('holds exactly one row of salon settings', async () => {
    const row = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ s: number; e: number }>(
        'select day_start_boundary as s, day_end_boundary as e from salon_settings',
      )
      return { rows: r.rowCount, ...r.rows[0] }
    })
    expect(row).toEqual({ rows: 1, s: 96, e: 240 }) // 08:00 to 20:00
  })

  it('refuses a second row of salon settings', async () => {
    await expect(
      asOwner((c) => c.query('insert into salon_settings (day_start_boundary, day_end_boundary) values (100, 200)')),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505')
  })
})
