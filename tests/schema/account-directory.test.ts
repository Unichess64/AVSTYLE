import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  OUTSIDER_AUTH,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'

beforeEach(resetData)

describe('account directory', () => {
  it('returns the seeded accounts to an active operator', async () => {
    const rows = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ id: string; email: string }>('select id, email from list_auth_accounts()')
      return r.rows
    })
    expect(rows.length).toBeGreaterThanOrEqual(4)
    expect(rows.map((r) => r.email)).toContain('vera@example.test')
  })

  it('returns exactly id and email — never a password hash or a token', async () => {
    const columns = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query('select * from list_auth_accounts() limit 1')
      return r.fields.map((f) => f.name)
    })
    expect(columns).toEqual(['id', 'email'])
  })

  // ⚠ discriminating: the guard that stops `security definer` handing
  // auth.users to any authenticated caller. With an empty auth.users this
  // could not be told from a function that returns nothing at all, which is
  // why supabase/seed.sql creates real accounts.
  it('returns nothing to an authenticated account that is not an operator', async () => {
    const n = await asOperator(OUTSIDER_AUTH, async (c) => (await c.query('select id from list_auth_accounts()')).rowCount)
    expect(n).toBe(0)
  })

  // A deactivated operator fails app.is_active_operator() the same way an
  // outsider does: is_active is part of that check, not just auth_user_id.
  it('returns nothing to a deactivated operator', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ALESSANDRA]))
    const n = await asOperator('00000000-0000-4000-8000-000000000003', async (c) =>
      (await c.query('select id from list_auth_accounts()')).rowCount,
    )
    expect(n).toBe(0)
  })

  it('is not callable at all by an unauthenticated visitor', async () => {
    await expect(asAnon((c) => c.query('select * from list_auth_accounts()'))).rejects.toThrow()
  })

  // ⚠ discriminating: "call as anon, expect it to throw" cannot tell EXECUTE
  // being revoked apart from EXECUTE granted but something deeper (RLS, a
  // table grant) raising a different error — the write-functions audit
  // (tests/schema/write-functions.test.ts) found exactly this shape unable
  // to fail three times over. Assert the 42501 code specifically, and check
  // the EXECUTE grant itself via has_function_privilege rather than
  // inferring it from behaviour.
  it('refuses anon with 42501, not merely zero rows', async () => {
    await expect(asAnon((c) => c.query('select * from list_auth_accounts()'))).rejects.toSatisfy(
      (e) => pgCode(e) === '42501',
    )
  })

  it('anon lacks EXECUTE on list_auth_accounts()', async () => {
    const has = await asOwner(async (c) => {
      const r = await c.query<{ has: boolean }>(`select has_function_privilege($1, $2, 'EXECUTE') as has`, [
        'anon',
        'public.list_auth_accounts()',
      ])
      return r.rows[0].has
    })
    expect(has).toBe(false)
  })

  it('authenticated has EXECUTE on list_auth_accounts()', async () => {
    const has = await asOwner(async (c) => {
      const r = await c.query<{ has: boolean }>(`select has_function_privilege($1, $2, 'EXECUTE') as has`, [
        'authenticated',
        'public.list_auth_accounts()',
      ])
      return r.rows[0].has
    })
    expect(has).toBe(true)
  })
})
