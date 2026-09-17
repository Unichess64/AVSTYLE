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
  // Both USING and WITH CHECK are checked: Postgres does not allow USING on an
  // INSERT policy, so `for insert with check (...)` is a real shape, and a
  // policy that only sets WITH CHECK must still route through the predicate.
  // polqual/polwithcheck are NULL when the corresponding clause is absent, and
  // `pg_get_expr(NULL, ...)` returns NULL too, so each side is coalesced to
  // '' first — otherwise `NULL not like '...'` is NULL, which WHERE treats as
  // false and the row silently disappears from the audit.
  it('routes every policy through app.is_active_operator()', async () => {
    const rogue = await asOwner(async (c) => {
      const r = await c.query<{ t: string; p: string }>(`
        select c.relname as t, p.polname as p
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%is_active_operator%'
          and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%is_active_operator%'
        order by 1, 2
      `)
      return r.rows
    })
    expect(rogue).toEqual([])
  })

  // §4.3 calls `set search_path = ''` "mandatory and not decoration ... the
  // textbook privilege-escalation route". This is the guard for that claim.
  // The value must be EMPTY, not merely present: `search_path=public` would
  // match a substring check just as happily as `search_path=`, but only the
  // empty value forces every reference to be schema-qualified. `proconfig` is
  // unnested so each `key=value` entry can be compared exactly, rather than
  // substring-matching the whole array. Postgres unparses an empty search_path
  // as `search_path=""` (a quoted empty identifier), not a bare trailing `=`,
  // so the value half is unquoted before the emptiness check.
  it('pins search_path on every security definer function', async () => {
    const unpinned = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select p.proname as f
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and p.prosecdef
          and not exists (
            select 1 from unnest(p.proconfig) cfg
            where split_part(cfg, '=', 1) = 'search_path'
              and trim(both '"' from split_part(cfg, '=', 2)) = ''
          )
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(unpinned).toEqual([])
  })

  // Guards against a double booking that RLS cannot see coming: TRUNCATE is
  // not gated by row-level security, and Supabase's default ACL grants it to
  // authenticated and anon. An operator who can truncate appointment_slot can
  // wipe every occupied cell and then insert a clashing appointment with
  // nothing left for the deferred unique constraint to collide against — a
  // committed double booking (task 7, finding 1). This audit reads the
  // catalogue directly, rather than re-deriving the privilege list from the
  // migration, so a future migration that widens the grant (or a new write
  // privilege Postgres adds) is caught here instead of being demonstrated
  // again by a reviewer.
  it('grants authenticated and anon nothing but SELECT on appointment_slot', async () => {
    const rows = await asOwner(async (c) => {
      const r = await c.query<{ grantee: string; privilege_type: string }>(`
        select grantee, privilege_type
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = 'appointment_slot'
          and grantee in ('authenticated', 'anon')
        order by 1, 2
      `)
      return r.rows
    })
    const byRole = (role: string) =>
      rows.filter((r) => r.grantee === role).map((r) => r.privilege_type)
    expect(byRole('authenticated')).toEqual(['SELECT'])
    expect(byRole('anon')).toEqual(['SELECT'])
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
