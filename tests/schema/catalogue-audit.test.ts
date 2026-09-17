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
  //
  // Both audits below read `pg_class.relacl` through `aclexplode`, joined to
  // `pg_roles` for the grantee name, rather than
  // `information_schema.role_table_grants` as an earlier version did.
  // Measured reason: MAINTAIN is a real, grantable table privilege (it backs
  // LOCK/VACUUM/ANALYZE/CLUSTER/REINDEX, none of it gated by row-level
  // security — RLS only gates SELECT/INSERT/UPDATE/DELETE), but
  // `information_schema.role_table_grants`'s privilege vocabulary predates
  // MAINTAIN and simply has no row for it — an audit built on that view is
  // structurally blind to it, passing green while `anon` held it on every
  // table. `aclexplode(pg_class.relacl)` decodes the ACL Postgres actually
  // stores and lists every privilege it contains, MAINTAIN included, so a
  // future privilege this same way is caught here rather than demonstrated
  // again by a reviewer.
  it('grants authenticated and anon nothing but SELECT on appointment_slot', async () => {
    const rows = await asOwner(async (c) => {
      const r = await c.query<{ grantee: string; privilege_type: string }>(`
        select r.rolname as grantee, a.privilege_type
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral aclexplode(c.relacl) a
        join pg_roles r on r.oid = a.grantee
        where n.nspname = 'public'
          and c.relname = 'appointment_slot'
          and r.rolname in ('authenticated', 'anon')
        order by 1, 2
      `)
      return r.rows
    })
    const byRole = (role: string) =>
      rows.filter((r) => r.grantee === role).map((r) => r.privilege_type)
    expect(byRole('authenticated')).toEqual(['SELECT'])
    expect(byRole('anon')).toEqual(['SELECT'])
  })

  // A re-review measured the appointment_slot audit above sees nothing
  // beyond that one table: Supabase's default ACL grants anon and
  // authenticated the full rDxtm set (references, delete, insert, select,
  // trigger, truncate, update, maintain) on EVERY table it creates in
  // public, and RLS does not gate TRUNCATE or MAINTAIN at all. Measured live
  // before the 0005b baseline migration existed: `truncate table client;` as
  // anon succeeded (wiping the only personal data in the system), and so did
  // `truncate table appointment;` (the same double-booking vector 0005
  // closed on appointment_slot, reached one join away by truncating its
  // parent instead). A later re-review measured MAINTAIN itself missing from
  // this same list: as anon, `lock table client in access exclusive mode`
  // and `analyze client` both succeeded, letting an unauthenticated caller
  // block every reader of the database — and the version of this audit that
  // read `information_schema.role_table_grants` could not have caught it,
  // because that view has no MAINTAIN row to find (see the comment above).
  // This audit enumerates every table and every privilege in the catalogue —
  // via `aclexplode(pg_class.relacl)`, not a hardcoded list and not a view
  // with a gap in its vocabulary — so a future table, or a future privilege
  // Postgres adds, that forgets the baseline grant is caught here instead of
  // being demonstrated again by a reviewer.
  it('grants no table truncate, references or trigger to anon/authenticated, and no insert/update/delete to anon', async () => {
    const offenders = await asOwner(async (c) => {
      const r = await c.query<{ o: string }>(`
        select c.relname || ': ' || a.privilege_type as o
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral aclexplode(c.relacl) a
        join pg_roles r on r.oid = a.grantee
        where n.nspname = 'public'
          and c.relkind = 'r'
          and (
            (r.rolname in ('anon', 'authenticated')
              and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'))
            or
            (r.rolname = 'anon'
              and a.privilege_type in ('INSERT', 'UPDATE', 'DELETE'))
          )
        order by 1
      `)
      return r.rows.map((x) => x.o)
    })
    expect(offenders).toEqual([])
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
