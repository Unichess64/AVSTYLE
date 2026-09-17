import { describe, expect, it } from 'vitest'
import { VERA_AUTH, asAnon, asOperator, asOwner } from '../helpers/db'

describe('test harness', () => {
  it('reaches the local database', async () => {
    const version = await asOwner(async (c) => {
      const r = await c.query<{ v: string }>('select version() as v')
      return r.rows[0].v
    })
    expect(version).toContain('PostgreSQL')
  })

  it('can assume the anon role', async () => {
    const role = await asAnon(async (c) => {
      const r = await c.query<{ r: string }>('select current_user as r')
      return r.rows[0].r
    })
    expect(role).toBe('anon')
  })

  // ⚠ discriminating. If impersonation silently failed to reach auth.uid(),
  // EVERY negative access-control test would pass for the wrong reason:
  // nobody would see anything, which is exactly what they assert.
  it('resolves auth.uid() to the impersonated account', async () => {
    const uid = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ u: string | null }>('select auth.uid() as u')
      return r.rows[0].u
    })
    expect(uid).toBe(VERA_AUTH)
  })

  it('leaves auth.uid() null for an unauthenticated visitor', async () => {
    const uid = await asAnon(async (c) => {
      const r = await c.query<{ u: string | null }>('select auth.uid() as u')
      return r.rows[0].u
    })
    expect(uid).toBeNull()
  })

  it('returns date columns as plain strings, not shifted Date objects', async () => {
    const d = await asOwner(async (c) => {
      const r = await c.query<{ d: string }>(`select date '2026-03-19' as d`)
      return r.rows[0].d
    })
    expect(d).toBe('2026-03-19')
  })
})
