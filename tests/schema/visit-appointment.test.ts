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
  // A single before/after read around one UPDATE does NOT discriminate here,
  // even inside one transaction: "before" is the row's insert-time value,
  // stamped by a DIFFERENT, earlier transaction (addAppointment's own
  // asOwner() call), so it is always older than "after" regardless of which
  // clock the trigger uses — a wall-clock gap between two transactions, not
  // a property of now() vs clock_timestamp(). To discriminate, BOTH
  // timestamps being compared must come from the trigger firing inside the
  // SAME transaction: two UPDATEs, one connection, begin/commit explicit
  // because asOwner() issues none of its own. now() is fixed for the whole
  // transaction, so both trigger firings would stamp the SAME value;
  // clock_timestamp() advances between statements, so they'd differ — BUT
  // two bare UPDATEs back to back are often under 1ms apart (JS Date has
  // millisecond resolution), which round-tripped this into a coin flip
  // in practice (measured: roughly half the runs failed even with the
  // correct clock_timestamp() migration in place). pg_sleep() between the
  // two UPDATEs forces a real gap for clock_timestamp() to register while
  // leaving a frozen now() exactly as frozen, so the comparison becomes
  // deterministic either way.
  it('bumps updated_at when an appointment changes', async () => {
    await addAppointment(APPT, 120, 18)
    const bumped = await asOwner(async (c) => {
      await c.query('begin')
      await c.query('update appointment set start_cell = 126 where id = $1', [APPT])
      const first = await c.query<{ u: Date }>('select updated_at as u from appointment where id = $1', [APPT])
      await c.query('select pg_sleep(0.01)')
      await c.query('update appointment set start_cell = 130 where id = $1', [APPT])
      const second = await c.query<{ u: Date }>('select updated_at as u from appointment where id = $1', [APPT])
      await c.query('commit')
      return second.rows[0].u.getTime() > first.rows[0].u.getTime()
    })
    expect(bumped).toBe(true)
  })

  it('bumps updated_at when the visit changes', async () => {
    const bumped = await asOwner(async (c) => {
      await c.query('begin')
      await c.query('update visit set visit_date = $1::date where id = $2', [DAY_TWO, VISIT])
      const first = await c.query<{ u: Date }>('select updated_at as u from visit where id = $1', [VISIT])
      await c.query('select pg_sleep(0.01)')
      await c.query('update visit set visit_date = $1::date where id = $2', [DAY_ONE, VISIT])
      const second = await c.query<{ u: Date }>('select updated_at as u from visit where id = $1', [VISIT])
      await c.query('commit')
      return second.rows[0].u.getTime() > first.rows[0].u.getTime()
    })
    expect(bumped).toBe(true)
  })
})
