import { beforeEach, describe, expect, it } from 'vitest'
import { VERA, VERA_AUTH, asOperator, asOwner, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const VISIT = '50000000-0000-4000-8000-000000000001'
const APPT = '60000000-0000-4000-8000-000000000001'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const activity = (clientId: string) =>
  asOperator(VERA_AUTH, async (c) => {
    const r = await c.query<{ a: string | null }>('select last_activity_at as a from client where id = $1', [clientId])
    return r.rows[0].a
  })

async function book(date: string, clientId = CLIENT_MARIA) {
  await asOwner(async (c) => {
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [VISIT, clientId, date])
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 18)`,
      [APPT, VISIT, VERA, SERVICE_REFILL, date],
    )
  })
}

describe('client activity', () => {
  it('is null for a client who has never booked', async () => {
    expect(await activity(CLIENT_MARIA)).toBeNull()
  })

  it('is set when an appointment is created', async () => {
    await book(DAY_ONE)
    expect(await activity(CLIENT_MARIA)).toBe(DAY_ONE)
  })

  it('leaves the other client untouched', async () => {
    await book(DAY_ONE)
    expect(await activity(CLIENT_LUCIA)).toBeNull()
  })

  it('follows the visit when the visit date changes', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query(`update visit set visit_date = date '2027-01-15' where id = $1`, [VISIT]))
    expect(await activity(CLIENT_MARIA)).toBe('2027-01-15')
  })

  // ⚠ discriminating: the ONLY branch the visit-side trigger alone can serve.
  // A visit-DATE change cascades onto appointment and fires that trigger too,
  // so it measures nothing here; reassigning the visit to another client does,
  // and it must update BOTH clients.
  it('moves the activity when a visit is reassigned to another client', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query('update visit set client_id = $1 where id = $2', [CLIENT_LUCIA, VISIT]))
    expect(await activity(CLIENT_MARIA)).toBeNull()
    expect(await activity(CLIENT_LUCIA)).toBe(DAY_ONE)
  })

  it('survives an appointment moving within the same visit', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query('update appointment set start_cell = 150 where id = $1', [APPT]))
    expect(await activity(CLIENT_MARIA)).toBe(DAY_ONE)
  })

  it('recomputes downward when the appointment is deleted', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query('delete from appointment where id = $1', [APPT]))
    expect(await activity(CLIENT_MARIA)).toBeNull()
  })

  it('counts a future visit, so a client who has just rebooked is not swept', async () => {
    await book('2027-06-01')
    expect(await activity(CLIENT_MARIA)).toBe('2027-06-01')
  })

  it('keeps the greatest date across two visits', async () => {
    await book(DAY_ONE)
    await asOwner(async (c) => {
      const V2 = '50000000-0000-4000-8000-000000000002'
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V2, CLIENT_MARIA, DAY_TWO])
      await c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 120, 18)`,
        [V2, VERA, SERVICE_REFILL, DAY_TWO],
      )
    })
    expect(await activity(CLIENT_MARIA)).toBe(DAY_TWO)
  })

  // ⚠ discriminating: an AGED client with a null activity date. A client
  // created today is not eligible either way, so the previous version of this
  // test could not tell the coalesce from its absence.
  it('makes an aged, never-booked client eligible through created_at', async () => {
    await asOwner((c) =>
      c.query(`insert into client (full_name, created_at) values ('Dimenticata', now() - interval '30 months')`),
    )
    const eligible = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string }>(`
        select count(*) as n from client
        where coalesce(last_activity_at, created_at::date) < current_date - interval '24 months'
      `)
      return Number(r.rows[0].n)
    })
    expect(eligible).toBe(1)
  })
})
