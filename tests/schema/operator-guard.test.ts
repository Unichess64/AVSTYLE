import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, ANNALISA, VERA, VERA_AUTH, asOperator, asOwner, connect, pgCode, resetData } from '../helpers/db'

beforeEach(resetData)

const leaveOnly = (keep: string[]) =>
  asOwner((c) => c.query('update operator set is_active = false where not (id = any($1))', [keep]))

describe('lockout guard', () => {
  it('refuses to deactivate the last linked active operator', async () => {
    await leaveOnly([VERA])
    await expect(
      asOperator(VERA_AUTH, (c) => c.query('update operator set is_active = false where id = $1', [VERA])),
    ).rejects.toThrow(/last active operator/i)
  })

  // ⚠ discriminating: access needs is_active AND auth_user_id, so unlinking
  // produces the identical lockout. A guard on is_active alone passes the test
  // above and fails this one.
  it('refuses to unlink the last linked active operator', async () => {
    await leaveOnly([VERA])
    await expect(
      asOperator(VERA_AUTH, (c) => c.query('update operator set auth_user_id = null where id = $1', [VERA])),
    ).rejects.toThrow(/last active operator/i)
  })

  it('allows deactivating an operator while others remain', async () => {
    await expect(
      asOperator(VERA_AUTH, (c) => c.query('update operator set is_active = false where id = $1', [ALESSANDRA])),
    ).resolves.toBeDefined()
  })

  it('refuses a multi-row update that would empty the roster', async () => {
    await expect(
      asOperator(VERA_AUTH, (c) => c.query('update operator set is_active = false')),
    ).rejects.toThrow(/last active operator/i)
  })

  // ⚠ discriminating: without an ORDERED lock this deadlocks (40P01) instead
  // of producing the guard's sentence, and in the salon two operators pressing
  // "disattiva" at once would see a raw Postgres deadlock error.
  it('cannot be defeated by two operators deactivating each other at once', async () => {
    await leaveOnly([VERA, ANNALISA])
    const a = await connect()
    const b = await connect()
    let secondError: unknown
    try {
      await a.query('begin')
      await b.query('begin')
      await a.query('update operator set is_active = false where id = $1', [ANNALISA])
      const second = b.query('update operator set is_active = false where id = $1', [VERA])
      await a.query('commit')
      await second.catch((e) => {
        secondError = e
      })
    } finally {
      await b.query('rollback').catch(() => {})
      await a.end()
      await b.end()
    }
    expect(pgCode(secondError)).not.toBe('40P01') // not a deadlock
    expect(String((secondError as Error)?.message)).toMatch(/last active operator/i)
  })
})
