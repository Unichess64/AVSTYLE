import pg from 'pg'

// A `date` column (OID 1082) is parsed by node-postgres into a JS Date at
// LOCAL midnight; converting it back with toISOString() returns the PREVIOUS
// day anywhere east of UTC — green in CI, red in Perugia. Dates stay strings.
pg.types.setTypeParser(1082, (v: string) => v)

export const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

// Operator row ids, fixed by the seed migration (spec D30).
export const VERA = '10000000-0000-4000-8000-000000000001'
export const ANNALISA = '10000000-0000-4000-8000-000000000002'
export const ALESSANDRA = '10000000-0000-4000-8000-000000000003'

// Supabase account ids, created and linked by supabase/seed.sql (local only).
export const VERA_AUTH = '00000000-0000-4000-8000-000000000001'
export const ANNALISA_AUTH = '00000000-0000-4000-8000-000000000002'
export const ALESSANDRA_AUTH = '00000000-0000-4000-8000-000000000003'

// A Supabase account that is not any operator: the second direction of §13.3.
export const OUTSIDER_AUTH = '00000000-0000-4000-8000-000000000009'

export async function connect(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  return client
}

async function inRole<T>(
  role: 'authenticated' | 'anon',
  authUid: string | null,
  fn: (c: pg.Client) => Promise<T>,
): Promise<T> {
  const client = await connect()
  try {
    await client.query('begin')
    if (authUid !== null) {
      // set_config BEFORE switching role: the claims GUC must be writable.
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: authUid, role }),
      ])
    }
    await client.query(`set local role ${role}`)
    return await fn(client)
  } finally {
    await client.query('rollback').catch(() => {})
    await client.end()
  }
}

/** The application role, as the given operator's account. Rolls back. */
export function asOperator<T>(authUid: string, fn: (c: pg.Client) => Promise<T>) {
  return inRole('authenticated', authUid, fn)
}

/** An unauthenticated visitor. Rolls back. */
export function asAnon<T>(fn: (c: pg.Client) => Promise<T>) {
  return inRole('anon', null, fn)
}

/** The database owner, which BYPASSES row-level security. Fixtures only. */
export async function asOwner<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = await connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

/**
 * Empties every application table and restores the operator roster.
 *
 * The table list is read from the catalogue rather than hard-coded: this
 * plan's migrations land one at a time, and resetData() is called from
 * Task 2 onward, so a literal list of every eventual table would raise
 * `42P01 relation does not exist` on every task before the schema is
 * complete. Only tables that currently exist in `public` are truncated.
 *
 * `operator` is excluded and restored rather than truncated: the seed
 * migration owns it and the lockout guard forbids emptying it — but tests
 * DO commit is_active changes, and Vitest orders files by size, not
 * alphabetically, so a failure mid-file would otherwise poison an unrelated
 * file on the next run. The restore itself is guarded to skip when
 * `operator` does not exist yet (before Task 2), so resetData() is safe to
 * call at any point in the build.
 *
 * `salon_settings` is also excluded: it holds exactly one seeded row that a
 * later task asserts on, and truncating it would empty it.
 */
export async function resetData(): Promise<void> {
  await asOwner(async (c) => {
    await c.query(`
      do $$
      declare stmt text;
      begin
        select string_agg(format('%I', c.relname), ', ')
        into stmt
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and c.relname <> 'operator'
          and c.relname <> 'salon_settings';
        if stmt is not null then
          execute 'truncate table ' || stmt || ' cascade';
        end if;
      end $$;
    `)
    await c.query(`
      do $$
      begin
        if to_regclass('public.operator') is not null then
          update operator set is_active = true, auth_user_id = case name
            when 'Vera'       then '00000000-0000-4000-8000-000000000001'::uuid
            when 'Annalisa'   then '00000000-0000-4000-8000-000000000002'::uuid
            when 'Alessandra' then '00000000-0000-4000-8000-000000000003'::uuid
          end;
        end if;
      end $$;
    `)
  })
}

/** The error code Postgres reports, e.g. '23505' for a unique violation. */
export function pgCode(error: unknown): string | undefined {
  return (error as { code?: string }).code
}
