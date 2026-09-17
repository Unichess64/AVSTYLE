import { describe, expect, it } from 'vitest'
import { asOwner } from '../helpers/db'

describe('catalogue audit', () => {
  it('has row-level security enabled on every table in public', async () => {
    const rows = await asOwner(async (c) => {
      const r = await c.query<{ t: string }>(`
        select c.relname as t from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
        order by 1
      `)
      return r.rows.map((x) => x.t)
    })
    expect(rows).toEqual([])
  })

  it('has at least one policy on every table in public', async () => {
    const rows = await asOwner(async (c) => {
      const r = await c.query<{ t: string }>(`
        select c.relname as t from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
        order by 1
      `)
      return r.rows.map((x) => x.t)
    })
    expect(rows).toEqual([])
  })

  // Without this, a future `using (true)` policy satisfies the test above.
  it('routes every policy through app.is_active_operator()', async () => {
    const rogue = await asOwner(async (c) => {
      const r = await c.query<{ t: string; p: string }>(`
        select c.relname as t, p.polname as p
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and pg_get_expr(p.polqual, p.polrelid) not like '%is_active_operator%'
        order by 1, 2
      `)
      return r.rows
    })
    expect(rogue).toEqual([])
  })

  // §4.3 calls `set search_path = ''` "mandatory and not decoration ... the
  // textbook privilege-escalation route". This is the guard for that claim.
  it('pins search_path on every security definer function', async () => {
    const unpinned = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select p.proname as f
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and p.prosecdef
          and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%'
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(unpinned).toEqual([])
  })

  it('does not force row-level security on operator', async () => {
    // Cheap insurance. Note the spec's corrected reasoning: with the superuser
    // owner Supabase uses, FORCE is inert; with a nobypassrls owner it raises
    // 54001, not 42P17.
    const forced = await asOwner(async (c) => {
      const r = await c.query<{ f: boolean }>(
        `select relforcerowsecurity as f from pg_class where relname = 'operator'`,
      )
      return r.rows[0].f
    })
    expect(forced).toBe(false)
  })
})
