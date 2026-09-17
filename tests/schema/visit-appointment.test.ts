import { beforeEach, describe, expect, it } from 'vitest'
import { VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const VISIT = '50000000-0000-4000-8000-000000000001'
const APPT = '60000000-0000-4000-8000-000000000001'

beforeEach(async () => {
  await resetData()
  await seedFixture()
  await asOwner((c) =>
    c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [VISIT, CLIENT_MARIA, DAY_ONE]),
  )
})

const addAppointment = (id: string, startCell: number, cellCount: number, date = DAY_ONE) =>
  asOwner((c) =>
    c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, $6, $7)`,
      [id, VISIT, VERA, SERVICE_REFILL, date, startCell, cellCount],
    ),
  )

const updatedAt = (table: 'visit' | 'appointment', id: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ u: Date }>(`select updated_at as u from ${table} where id = $1`, [id])
    return r.rows[0].u.getTime()
  })

describe('visit and appointment', () => {
  it('stores an appointment at cell 120 for 18 cells (10:00, 90 minutes)', async () => {
    await addAppointment(APPT, 120, 18)
    const row = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ s: number; n: number }>('select start_cell as s, cell_count as n from appointment')
      return r.rows[0]
    })
    expect(row).toEqual({ s: 120, n: 18 })
  })

  it.each([0, -12])('refuses cell_count %i', async (count) => {
    await expect(addAppointment(APPT, 120, count)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses an appointment that would cross midnight', async () => {
    await expect(addAppointment(APPT, 285, 6)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses an appointment whose date differs from its visit', async () => {
    await expect(addAppointment(APPT, 120, 18, DAY_TWO)).rejects.toSatisfy((e) => pgCode(e) === '23503')
  })

  it('carries the appointments when the visit moves to another date', async () => {
    await addAppointment(APPT, 120, 18)
    await asOwner((c) => c.query('update visit set visit_date = $1::date where id = $2', [DAY_TWO, VISIT]))
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: string }>('select appointment_date as d from appointment')
      return r.rows[0].d
    })
    expect(d).toBe(DAY_TWO)
  })

  // ⚠ discriminating: the defect that made erasure unexecutable in revision 3.
  it('deletes a client with visits and appointments in one statement', async () => {
    await addAppointment(APPT, 120, 18)
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    const counts = await asOwner(async (c) => {
      const r = await c.query<{ v: string; a: string }>(
        'select (select count(*) from visit) as v, (select count(*) from appointment) as a',
      )
      return r.rows[0]
    })
    expect(counts).toEqual({ v: '0', a: '0' })
  })

  // ⚠ discriminating: §10.2's lost-update design rests on these triggers.
  it('bumps updated_at when an appointment changes', async () => {
    await addAppointment(APPT, 120, 18)
    const before = await updatedAt('appointment', APPT)
    await asOwner((c) => c.query('update appointment set start_cell = 126 where id = $1', [APPT]))
    expect(await updatedAt('appointment', APPT)).toBeGreaterThan(before)
  })

  it('bumps updated_at when the visit changes', async () => {
    const before = await updatedAt('visit', VISIT)
    await asOwner((c) => c.query('update visit set visit_date = $1::date where id = $2', [DAY_TWO, VISIT]))
    expect(await updatedAt('visit', VISIT)).toBeGreaterThan(before)
  })
})
