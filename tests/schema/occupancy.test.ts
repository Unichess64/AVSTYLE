import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, VERA, VERA_AUTH, asOperator, asOwner, connect, pgCode, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const V1 = '50000000-0000-4000-8000-000000000001'
const V2 = '50000000-0000-4000-8000-000000000002'
const APPT = '60000000-0000-4000-8000-000000000001'

beforeEach(async () => {
  await resetData()
  await seedFixture()
  await asOwner(async (c) => {
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V1, CLIENT_MARIA, DAY_ONE])
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V2, CLIENT_LUCIA, DAY_TWO])
    // Vera, day one, 10:00 for 90 minutes: cells 120..137.
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 18)`,
      [APPT, V1, VERA, SERVICE_REFILL, DAY_ONE],
    )
  })
})

const cellsOf = (id: string) =>
  asOperator(VERA_AUTH, async (c) => {
    const r = await c.query<{ i: number }>(
      'select cell_index as i from appointment_slot where appointment_id = $1 order by 1',
      [id],
    )
    return r.rows.map((x) => x.i)
  })

const slotCount = () => asOperator(VERA_AUTH, async (c) => (await c.query('select 1 from appointment_slot')).rowCount)

describe('occupancy', () => {
  it('materialises one cell per five minutes', async () => {
    const cells = await cellsOf(APPT)
    expect([cells.length, cells[0], cells[17]]).toEqual([18, 120, 137])
  })

  it('refuses an overlapping appointment for the same operator and date', async () => {
    await expect(
      asOwner((c) =>
        c.query(
          `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
           values ($1, $2, $3, $4::date, 130, 6)`,
          [V1, VERA, SERVICE_REFILL, DAY_ONE],
        ),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505')
  })

  it('accepts the same cells for a different operator', async () => {
    await asOwner((c) =>
      c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 120, 18)`,
        [V1, ANNALISA, SERVICE_REFILL, DAY_ONE],
      ),
    )
    expect(await slotCount()).toBe(36)
  })

  it('accepts the same cells on a different date', async () => {
    await asOwner((c) =>
      c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 120, 18)`,
        [V2, VERA, SERVICE_REFILL, DAY_TWO],
      ),
    )
    expect(await slotCount()).toBe(36)
  })

  it('realigns the cells when the appointment is shortened', async () => {
    await asOwner((c) => c.query('update appointment set cell_count = 12 where id = $1', [APPT]))
    const cells = await cellsOf(APPT)
    expect([cells.length, cells[11]]).toEqual([12, 131])
  })

  it('realigns the cells when the appointment is lengthened', async () => {
    await asOwner((c) => c.query('update appointment set cell_count = 24 where id = $1', [APPT]))
    const cells = await cellsOf(APPT)
    expect([cells.length, cells[23]]).toEqual([24, 143])
  })

  it('realigns the cells when the appointment moves in time', async () => {
    await asOwner((c) => c.query('update appointment set start_cell = 150 where id = $1', [APPT]))
    const cells = await cellsOf(APPT)
    expect([cells[0], cells[17]]).toEqual([150, 167])
  })

  // ⚠ discriminating. A test that changes ONLY operator_id measures the
  // composite key's ON UPDATE CASCADE, not the trigger: the cascade rewrites
  // the child rows by itself, and the suite stays green with the trigger gone.
  // Changing the operator AND the cells forces the trigger to be the author.
  it('realigns operator AND cells when both change at once', async () => {
    await asOwner((c) =>
      c.query('update appointment set operator_id = $1, start_cell = 150 where id = $2', [ANNALISA, APPT]),
    )
    const rows = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ o: string; i: number }>(
        'select operator_id as o, cell_index as i from appointment_slot where appointment_id = $1 order by i',
        [APPT],
      )
      return r.rows
    })
    expect(rows.length).toBe(18)
    expect(rows[0]).toEqual({ o: ANNALISA, i: 150 })
    expect(rows[17]).toEqual({ o: ANNALISA, i: 167 })
  })

  // ⚠ discriminating: the self-overlap case a naive insert-before-delete fails.
  it('moves an appointment by less than its own duration', async () => {
    await asOwner((c) => c.query('update appointment set start_cell = 126 where id = $1', [APPT]))
    const cells = await cellsOf(APPT)
    expect([cells[0], cells[17]]).toEqual([126, 143])
  })

  // Measures the composite FK's ON DELETE CASCADE, not the trigger: removing
  // the trigger's DELETE branch leaves this green (verified by hand — flipping
  // the FK to `on delete no action` is what turns it red, with 23503). The
  // regression this actually guards is an earlier spec revision that shipped
  // without the cascade.
  it('removes the cells when the appointment is deleted', async () => {
    await asOwner((c) => c.query('delete from appointment where id = $1', [APPT]))
    expect(await cellsOf(APPT)).toEqual([])
  })

  // Same as above: measures the composite FK's ON DELETE CASCADE (through
  // appointment) rather than the trigger. See the comment on the previous test.
  it('removes the cells when the client is deleted', async () => {
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    expect(await slotCount()).toBe(0)
  })

  it('lets the application READ the cells', async () => {
    expect(await slotCount()).toBe(18)
  })

  // Note: the INSERT case below would also raise 42501 from RLS alone, so only
  // update and delete measure the revocation. Do not drop the revoke on the
  // strength of the insert case.
  it.each(['update', 'delete'] as const)('refuses a direct %s on appointment_slot', async (verb) => {
    const sql = {
      update: `update appointment_slot set cell_index = 200 where appointment_id = '${APPT}'`,
      delete: `delete from appointment_slot where appointment_id = '${APPT}'`,
    }[verb]
    await expect(asOperator(VERA_AUTH, (c) => c.query(sql))).rejects.toSatisfy((e) => pgCode(e) === '42501')
  })

  it('refuses a direct insert on appointment_slot', async () => {
    await expect(
      asOperator(VERA_AUTH, (c) =>
        c.query(
          `insert into appointment_slot (appointment_id, operator_id, appointment_date, cell_index)
           values ('${APPT}', '${VERA}', date '${DAY_ONE}', 200)`,
        ),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501')
  })

  // ⚠ discriminating: measure 3, which nothing else exercises, because the
  // application cannot write this table at all.
  it('refuses a cell whose operator diverges from its appointment', async () => {
    await expect(
      asOwner((c) =>
        c.query(
          `insert into appointment_slot (appointment_id, operator_id, appointment_date, cell_index)
           values ($1, $2, $3::date, 200)`,
          [APPT, ANNALISA, DAY_ONE],
        ),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23503')
  })

  // The deferred constraint does NOT block and does NOT raise on insert: it
  // reports at COMMIT. Asserting that the insert rejects would fail, and
  // "fixing" that by asserting nothing would let a double booking through.
  it('rejects a concurrent booking of the same cells at commit time', async () => {
    const a = await connect()
    const b = await connect()
    try {
      await a.query('begin')
      await b.query('begin')
      const insert = `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
                      values ('${V1}', '${VERA}', '${SERVICE_REFILL}', date '${DAY_ONE}', 200, 6)`
      await a.query(insert)
      await b.query(insert) // resolves: deferred constraints do not check here
      await a.query('commit')
      await expect(b.query('commit')).rejects.toSatisfy((e) => pgCode(e) === '23505')
    } finally {
      await b.query('rollback').catch(() => {})
      await a.end()
      await b.end()
    }
  })
})
