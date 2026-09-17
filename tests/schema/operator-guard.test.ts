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

  // ⚠ discriminating: auth_user_id IS NOT NULL alone is insufficient — a
  // relink to a uuid that names no account leaves auth_user_id non-null (so
  // a guard checking only that clause approves it) while producing the
  // identical lockout, since no account can ever satisfy
  // is_active_operator() for this row again. Reachable from the Settings
  // "link to an account" screen with a mistyped or stale uuid.
  it('refuses to relink the last linked active operator to a non-existent account', async () => {
    await leaveOnly([VERA])
    await expect(
      asOperator(VERA_AUTH, (c) =>
        c.query('update operator set auth_user_id = $1 where id = $2', [
          '99999999-9999-4999-8999-999999999999',
          VERA,
        ]),
      ),
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

  // ⚠ discriminating: proves the property the FOR UPDATE lock actually buys —
  // the two transactions can never BOTH commit. Each session defers its
  // constraint trigger, so its own UPDATE (deactivating the OTHER operator)
  // never blocks — the row lock and the count only happen at COMMIT, and
  // both commits are sent together so the check genuinely races. Without the
  // lock, neither commit-time count sees the other's still-uncommitted
  // change, so both pass their own check and both commit, emptying the
  // roster (measured 20/20 with the lock removed — see this task's report).
  // With the lock, at least one side is always refused, by this function's
  // own exception (23514) or by Postgres's deadlock detector (40P01) — both
  // are a correct outcome; the application must retry on 40P01.
  it('never lets two operators deactivating each other BOTH commit', async () => {
    await leaveOnly([VERA, ANNALISA])
    const a = await connect()
    const b = await connect()
    let settled: PromiseSettledResult<unknown>[]
    try {
      await a.query('begin')
      await b.query('begin')
      await a.query('set constraints all deferred')
      await b.query('set constraints all deferred')
      await a.query('update operator set is_active = false where id = $1', [ANNALISA])
      await b.query('update operator set is_active = false where id = $1', [VERA])
      settled = await Promise.allSettled([a.query('commit'), b.query('commit')])
    } finally {
      await a.query('rollback').catch(() => {})
      await b.query('rollback').catch(() => {})
      await a.end()
      await b.end()
    }

    const rejected = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    expect(rejected.length).toBeGreaterThanOrEqual(1)
    for (const r of rejected) {
      expect(['23514', '40P01', '55P03']).toContain(pgCode(r.reason))
    }

    const stillGuarded = await asOwner((c) =>
      c.query('select 1 from operator where is_active and auth_user_id is not null'),
    )
    expect(stillGuarded.rowCount).toBeGreaterThanOrEqual(1)
  })
})
