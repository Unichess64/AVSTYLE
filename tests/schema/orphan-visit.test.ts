import { beforeEach, describe, expect, it } from 'vitest'
import { VERA, VERA_AUTH, asOperator, asOwner, connect, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const VISIT = '50000000-0000-4000-8000-000000000001'
const A1 = '60000000-0000-4000-8000-000000000001'
const A2 = '60000000-0000-4000-8000-000000000002'

beforeEach(async () => {
  await resetData()
  await seedFixture()
  await asOwner(async (c) => {
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [VISIT, CLIENT_MARIA, DAY_ONE])
    // Manicure 10:00-11:00 (120-131), pedicure 11:00-12:00 (132-143).
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 12), ($6, $2, $3, $4, $5::date, 132, 12)`,
      [A1, VISIT, VERA, SERVICE_REFILL, DAY_ONE, A2],
    )
  })
})

const visitCount = () => asOperator(VERA_AUTH, async (c) => (await c.query('select 1 from visit')).rowCount)

describe('orphan visit guard', () => {
  it('removes the visit when its last appointment goes', async () => {
    await asOwner(async (c) => {
      await c.query('delete from appointment where id = $1', [A1])
      await c.query('delete from appointment where id = $1', [A2])
    })
    expect(await visitCount()).toBe(0)
  })

  it('keeps the visit while an appointment remains', async () => {
    await asOwner((c) => c.query('delete from appointment where id = $1', [A1]))
    expect(await visitCount()).toBe(1)
  })

  it('survives a client deletion cascading through both', async () => {
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    expect(await visitCount()).toBe(0)
  })

  // ⚠ discriminating. Run in sequence this passes over the defect; it must be
  // two genuinely overlapping transactions. Spec §6.3.
  it('removes the visit when the two deletions overlap', async () => {
    const a = await connect()
    const b = await connect()
    try {
      await a.query('begin')
      await b.query('begin')
      await a.query('delete from appointment where id = $1', [A1])
      const second = b.query('delete from appointment where id = $1', [A2])
      await a.query('commit')
      await second
      await b.query('commit')
    } finally {
      await a.end()
      await b.end()
    }
    expect(await visitCount()).toBe(0)
  })
})
