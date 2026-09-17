# Salon Scheduler — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the database for the AVStyle salon scheduler — every table, constraint, trigger, policy and database function of the spec — and prove each safeguard with a test that fails without it.

**Architecture:** A local Supabase stack (Postgres 15 + PostgREST) driven by SQL migrations. Every safeguard lives in the database, not in application code, so every test speaks to Postgres directly through `pg`, impersonating the roles PostgREST would use. No Next.js, no UI, no application code in this plan.

**Tech Stack:** Supabase CLI, PostgreSQL 15 (`btree_gist`, `unaccent`), TypeScript, Vitest, `pg`.

**Spec:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md` (revision 4)

> **This plan was reviewed twice before execution, and the second reviewer stood
> up a live PostgreSQL and ran the DDL.** It found that five safeguards could be
> deleted with the suite staying green, three tests could not pass at all, and
> two claims the spec made about Postgres were false. Those corrections are in
> this revision. Every test rewritten to *discriminate* rather than merely to
> pass is marked **⚠ discriminating**: removing the safeguard must turn it red,
> and if it does not, the test is worthless and the task is not done.

**Why this plan exists and comes first:** spec §15. Three rounds of adversarial review found that the spec's database detail — foreign-key actions, trigger firing order, trigger names, lock acquisition, grants — cannot be settled by reading. §15 declares the DDL *normative in intent and indicative in syntax*, and states that where a passing test and the document disagree, **the test wins and the spec is corrected**. This plan is that reckoning.

## Global Constraints

Values copied verbatim from the spec. Every task's requirements implicitly include this section.

- **Cells are 5 minutes.** 288 cells per day, indices **0–287**. Boundaries **0–288**. (spec §5, D16)
- **Cell index vs boundary index are different domains** and are never compared directly. An appointment fits a range when `start_cell >= start_boundary and start_cell + cell_count <= end_boundary`. (spec §5)
- **Availability ranges are `[start_boundary, end_boundary)`** — end exclusive. (spec §5)
- **No appointment crosses midnight:** `start_cell + cell_count <= 288`, and `cell_count > 0`. (spec §5, §6.3)
- **`weekday` is 0 = Monday … 6 = Sunday.** SQL mapping is `extract(isodow from d) - 1`. (spec §5.2)
- **Dates are calendar dates**, never `timestamptz`. `last_activity_at` is a **`date`**. (spec §5.1, §6.2.2)
- **Identifiers, comments and commit messages in English**; user-facing strings (none in this plan) in Italian. (spec §2.1)
- **Access control predicate is `app.is_active_operator()`** on every table, every verb. (spec §4.3)
- **`security definer` functions always carry `set search_path = ''`** and fully schema-qualify every reference. (spec §4.3)
- **`operator` seed rows and their ids are fixed** (spec D30) — see Task 2 for the exact UUIDs, which tests depend on.
- **Fixtures carry at least two operators, two dates, two clients and two services** (spec §13.2). A single-row fixture leaves every scoping predicate declared and never exercised. Task 2 builds the shared fixture; no test rolls its own single-row version.
- **Never measure with `psql` as the database owner.** The owner bypasses row-level security, so a query that should return nothing returns everything. Every assertion goes through the helpers of Task 1. The one exception is inspecting the **catalogue** (`pg_class`, `information_schema`), where row-level security is not involved.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | Scripts and dev dependencies |
| `tsconfig.json` | TypeScript config for tests only |
| `vitest.config.ts` | Single-threaded test runner (shared database) |
| `supabase/config.toml` | Auth configuration — signup and OAuth disabled (spec §4.2) |
| `supabase/seed.sql` | **Local only.** Creates the test `auth.users` rows and links the operators |
| `supabase/migrations/0001_access_control.sql` | `app` schema, `operator`, helper function, grants, RLS, operator seed |
| `supabase/migrations/0002_catalogue.sql` | `service_category`, `service`, `operator_service`, `salon_settings` |
| `supabase/migrations/0003_client.sql` | `client` and its birthday constraints, search index |
| `supabase/migrations/0004_visit_appointment.sql` | `visit`, `appointment`, composite keys |
| `supabase/migrations/0005_occupancy.sql` | `appointment_slot`, the sync trigger, the unique constraint, the revocation |
| `supabase/migrations/0006_availability.sql` | `weekly_availability`, `exception_day`, `exception_range`, `salon_closure` |
| `supabase/migrations/0007_client_activity.sql` | `last_activity_at` trigger |
| `supabase/migrations/0008_orphan_visit.sql` | Orphan-visit trigger with row lock |
| `supabase/migrations/0009_operator_guard.sql` | Last-operator lockout guard with row lock |
| `supabase/migrations/0010_write_functions.sql` | Transactional write functions (move visit, swap, write exception day) |
| `supabase/migrations/0011_account_directory.sql` | `security definer` function exposing `auth.users` id + email |
| `tests/helpers/db.ts` | Role impersonation, reset, fixed UUIDs |
| `tests/helpers/fixtures.ts` | The two-of-everything fixture spec §13.2 requires |
| `tests/schema/*.test.ts` | One file per migration's safeguards |

Migrations are split by responsibility so that a failing test names the file to open. They are never edited after a later migration depends on them; corrections are new migrations.

---

## Task 1: Project skeleton and a harness that measures reality

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `supabase/` (by `supabase init`)
- Create: `tests/helpers/db.ts`
- Test: `tests/schema/harness.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces, from `tests/helpers/db.ts`: `DB_URL`, `connect()`, `asOperator(authUid, fn)`, `asAnon(fn)`, `asOwner(fn)`, `resetData()`, `pgCode(error)`, and the constants `VERA`, `ANNALISA`, `ALESSANDRA`, `VERA_AUTH`, `ANNALISA_AUTH`, `ALESSANDRA_AUTH`, `OUTSIDER_AUTH`

The harness is task one because every later assertion depends on it telling the truth. A test that runs as the database owner sees through row-level security and reports success for the wrong reason.

- [ ] **Step 1: Create the Node project**

From the repository root:

```bash
npm init -y
npm pkg set type=module private=true name=salon-scheduler
npm pkg delete main version description
npm install --save-dev vitest@^2.1.8 typescript@^5.7.2 pg@^8.13.1 @types/pg@^8.11.10 supabase@^2.2.1
npm pkg set scripts.test="vitest run" scripts.db:start="supabase start" scripts.db:reset="supabase db reset"
```

- [ ] **Step 2: Write the config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"],
    "noEmit": true
  },
  "include": ["tests/**/*.ts", "vitest.config.ts"]
}
```

`vitest.config.ts` — one thread, because every test shares one database:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
```

`.gitignore`:

```
node_modules/
.env
.env.local
supabase/.temp/
supabase/.branches/
```

- [ ] **Step 3: Initialise and start Supabase**

```bash
npx supabase init
npx supabase start
```

Expected: a table of local URLs ending with `DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres`. If Docker is not running, start Docker Desktop first.

- [ ] **Step 4: Write the test helper**

`tests/helpers/db.ts`:

```ts
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
 * `operator` is restored rather than truncated: the seed migration owns it and
 * the lockout guard forbids emptying it — but tests DO commit is_active
 * changes, and Vitest orders files by size, not alphabetically, so a failure
 * mid-file would otherwise poison an unrelated file on the next run.
 *
 * appointment_slot is listed explicitly. It would also be cleared through the
 * cascade from appointment, but relying on that silently stops working the day
 * the parent key changes, while every count assertion keeps "passing".
 */
export async function resetData(): Promise<void> {
  await asOwner(async (c) => {
    await c.query(`
      truncate table
        appointment_slot, appointment, visit, client,
        exception_range, exception_day, weekly_availability, salon_closure,
        operator_service, service, service_category
      cascade
    `)
    await c.query(`
      update operator set is_active = true, auth_user_id = case name
        when 'Vera'       then '00000000-0000-4000-8000-000000000001'::uuid
        when 'Annalisa'   then '00000000-0000-4000-8000-000000000002'::uuid
        when 'Alessandra' then '00000000-0000-4000-8000-000000000003'::uuid
      end
    `)
  })
}

/** The error code Postgres reports, e.g. '23505' for a unique violation. */
export function pgCode(error: unknown): string | undefined {
  return (error as { code?: string }).code
}
```

- [ ] **Step 5: Write the failing harness test**

`tests/schema/harness.test.ts`:

```ts
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
```

- [ ] **Step 6: Run it**

Run: `npm test`
Expected: **PASS**, all five. The third and fifth are why this task exists. A failure means Supabase is not running (`npx supabase start`) or the port differs from 54322 — read it from `npx supabase status` and set `DATABASE_URL`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore supabase tests
git commit -m "chore: project skeleton, local Supabase and a role-aware test harness"
```

---

## Task 2: Auth configuration, access control, the operator seed and the shared fixture

**Files:**
- Modify: `supabase/config.toml`
- Create: `supabase/migrations/0001_access_control.sql`, `supabase/seed.sql`
- Create: `tests/helpers/fixtures.ts`
- Test: `tests/schema/access-control.test.ts`

**Interfaces:**
- Consumes: Task 1's helpers
- Produces: `operator (id, auth_user_id, name, color, is_active, sort_order)`; `app.is_active_operator() returns boolean`; the three seeded rows; and `seedFixture()` plus the id constants from `tests/helpers/fixtures.ts`

Spec §4.2 and §4.3. `config.toml` belongs to this task because the repository's `README.md` states that signup is disabled, and nothing else makes that true.

- [ ] **Step 1: Write the shared fixture**

`tests/helpers/fixtures.ts` — the two-of-everything fixture §13.2 requires:

```ts
import { ALESSANDRA, ANNALISA, VERA, asOwner } from './db'

export const CAT_NAILS = '20000000-0000-4000-8000-000000000001'
export const CAT_BODY = '20000000-0000-4000-8000-000000000002'
export const SERVICE_REFILL = '30000000-0000-4000-8000-000000000001'
export const SERVICE_MASSAGE = '30000000-0000-4000-8000-000000000002'
export const CLIENT_MARIA = '40000000-0000-4000-8000-000000000001'
export const CLIENT_LUCIA = '40000000-0000-4000-8000-000000000002'
export const DAY_ONE = '2026-03-12'
export const DAY_TWO = '2026-03-19'

/**
 * Two categories, two services, two clients, three operators; callers use two
 * dates. Spec §13.2 opens by requiring this: with one of anything, every
 * predicate that scopes by it is declared and never exercised.
 */
export async function seedFixture(): Promise<void> {
  await asOwner(async (c) => {
    await c.query(
      `insert into service_category (id, name, sort_order) values ($1, 'Unghie', 1), ($2, 'Corpo', 2)`,
      [CAT_NAILS, CAT_BODY],
    )
    await c.query(
      `insert into service (id, name, category_id, default_duration_cells, buffer_after_cells)
       values ($1, 'Refill gel', $2, 18, 0), ($3, 'Massaggio', $4, 10, 3)`,
      [SERVICE_REFILL, CAT_NAILS, SERVICE_MASSAGE, CAT_BODY],
    )
    await c.query(
      `insert into operator_service (operator_id, service_id) values ($1, $3), ($2, $3), ($4, $5)`,
      [VERA, ANNALISA, SERVICE_REFILL, ALESSANDRA, SERVICE_MASSAGE],
    )
    await c.query(
      `insert into client (id, full_name, phone) values
         ($1, 'Maria Rossi', '+393331234567'),
         ($2, 'Lucia Ciccarè', '+393337654321')`,
      [CLIENT_MARIA, CLIENT_LUCIA],
    )
  })
}
```

- [ ] **Step 2: Write the failing test**

`tests/schema/access-control.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ALESSANDRA, ANNALISA, VERA,
  ALESSANDRA_AUTH, ANNALISA_AUTH, OUTSIDER_AUTH, VERA_AUTH,
  asAnon, asOperator, asOwner, resetData,
} from '../helpers/db'
import { seedFixture } from '../helpers/fixtures'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('auth configuration', () => {
  // The README asserts this. Without the assertion, the README is a false claim.
  it('disables self-service signup and anonymous sign-in locally', () => {
    const config = readFileSync('supabase/config.toml', 'utf8')
    expect(config).toMatch(/^\s*enable_signup\s*=\s*false/m)
    expect(config).toMatch(/^\s*enable_anonymous_sign_ins\s*=\s*false/m)
  })
})

describe('access control', () => {
  it('lets an active, linked operator read the operators', async () => {
    const names = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ name: string }>('select name from operator order by sort_order')
      return r.rows.map((x) => x.name)
    })
    expect(names).toEqual(['Vera', 'Annalisa', 'Alessandra'])
  })

  it('shows nothing to an unauthenticated visitor', async () => {
    const n = await asAnon(async (c) => (await c.query('select id from operator')).rowCount)
    expect(n).toBe(0)
  })

  it('shows nothing to an authenticated account that is not an operator', async () => {
    const n = await asOperator(OUTSIDER_AUTH, async (c) => (await c.query('select id from operator')).rowCount)
    expect(n).toBe(0)
  })

  it('shows nothing to a deactivated operator', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ALESSANDRA]))
    const n = await asOperator(ALESSANDRA_AUTH, async (c) => (await c.query('select id from operator')).rowCount)
    expect(n).toBe(0)
  })

  // The predicate must protect every table, not only the one it lives nearest.
  it('hides client data from an outsider', async () => {
    const n = await asOperator(OUTSIDER_AUTH, async (c) => (await c.query('select id from client')).rowCount)
    expect(n).toBe(0)
  })

  it('hides client data from an unauthenticated visitor', async () => {
    const n = await asAnon(async (c) => (await c.query('select id from client')).rowCount)
    expect(n).toBe(0)
  })

  it('does not recurse on the operator policy itself', async () => {
    const n = await asOperator(ANNALISA_AUTH, async (c) =>
      (await c.query('select id from operator where id = $1', [ANNALISA])).rowCount,
    )
    expect(n).toBe(1)
  })

  it('seeds exactly three operators with the expected ids', async () => {
    const ids = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ id: string }>('select id from operator order by sort_order')
      return r.rows.map((x) => x.id)
    })
    expect(ids).toEqual([VERA, ANNALISA, ALESSANDRA])
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- tests/schema/access-control.test.ts`
Expected: FAIL — `relation "operator" does not exist`, and the config assertion fails too.

- [ ] **Step 4: Disable signup in `supabase/config.toml`**

Under `[auth]`, set:

```toml
[auth]
enable_signup = false
enable_anonymous_sign_ins = false
```

Leave every `[auth.external.*]` provider at `enabled = false`. Record in the commit message that the **hosted** project needs the same settings applied in its dashboard: `config.toml` governs the local stack only.

- [ ] **Step 5: Write the migration**

`supabase/migrations/0001_access_control.sql`:

```sql
-- Access control and the operator roster. Spec §4.2, §4.3, §6.1, D30.

-- Schema-qualified: Supabase keeps extensions out of public, and an
-- unqualified `if not exists` silently no-ops if a future base image
-- pre-installs one elsewhere — after which immutable_unaccent fails at
-- creation and takes every later migration with it.
create extension if not exists btree_gist with schema extensions;

create schema if not exists app;
grant usage on schema app to authenticated, anon;

create table operator (
  id            uuid primary key default gen_random_uuid(),
  -- Deliberately NOT a foreign key to auth.users: that schema is managed by
  -- Supabase and a reference would couple these migrations to it.
  auth_user_id  uuid unique,
  name          text not null,
  color         text not null,
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

-- Row-level security is bypassed by the OWNER of a table, and this function's
-- owner also owns public.operator — which is why the lookup inside a policy on
-- `operator` does not re-enter that policy. `security definer` alone would not
-- do it. Spec §4.3.
create function app.is_active_operator() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator o
    where o.auth_user_id = auth.uid()
      and o.is_active
  )
$$;

grant execute on function app.is_active_operator() to authenticated, anon;

-- A policy on a table WITHOUT row-level security enabled is inert. Spec §4.3.
alter table operator enable row level security;

create policy operator_access on operator
  for all
  using (app.is_active_operator())
  with check (app.is_active_operator());

-- Seeded, not created at first run: access depends on a row being here, so a
-- first run that had to write the first row could never write it. Spec D30.
insert into operator (id, auth_user_id, name, color, sort_order) values
  ('10000000-0000-4000-8000-000000000001', null, 'Vera',       '#C2185B', 1),
  ('10000000-0000-4000-8000-000000000002', null, 'Annalisa',   '#7B3F61', 2),
  ('10000000-0000-4000-8000-000000000003', null, 'Alessandra', '#2F6F6B', 3);
```

- [ ] **Step 6: Write the local seed**

`supabase/seed.sql`. It creates real `auth.users` rows: without them Task 13's directory function has nothing to read and its tests would assert nothing at all.

```sql
-- Local development only. Spec §4.3, README.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'vera@example.test', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'annalisa@example.test', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alessandra@example.test', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'outsider@example.test', '', now(), now(), now())
on conflict (id) do nothing;

update operator set auth_user_id = '00000000-0000-4000-8000-000000000001' where name = 'Vera';
update operator set auth_user_id = '00000000-0000-4000-8000-000000000002' where name = 'Annalisa';
update operator set auth_user_id = '00000000-0000-4000-8000-000000000003' where name = 'Alessandra';
```

If the local `auth.users` shape rejects this insert, adjust the column list to match `\d auth.users` and record the change for Task 15 — it is a Supabase version detail, not a design decision.

- [ ] **Step 7: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS. Note that `supabase db reset` runs the migrations **and** `seed.sql`; `supabase migration up` does not, and would leave three unlinked operators and a wall of failures with no obvious cause.

- [ ] **Step 8: ⚠ Prove the RLS switch is load-bearing**

Comment out `alter table operator enable row level security;`, then `npx supabase db reset && npm test`.

Expected: the anon, outsider and deactivated tests **FAIL** — they see all three operators. That is the silent hole of §4.3. Restore the line, reset, confirm green **before committing**. If they do not fail, the tests are worthless and this task is not done.

- [ ] **Step 9: Commit**

```bash
git add supabase tests/schema/access-control.test.ts tests/helpers/fixtures.ts
git commit -m "feat(db): access control, seeded roster, disabled signup and the shared fixture"
```

---

## Task 3: Catalogue audits — row-level security and definer hygiene

**Files:**
- Test: `tests/schema/catalogue-audit.test.ts`

**Interfaces:**
- Consumes: `asOwner`
- Produces: standing guards every later task is held to; no schema changes

Enumerated from `pg_class` and `pg_proc` rather than from a hand-written list, because a hand-written list is what lets a new table or a new function slip through.

- [ ] **Step 1: Write the test**

`tests/schema/catalogue-audit.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/schema/catalogue-audit.test.ts
git commit -m "test(db): catalogue audits for RLS, policy routing and definer search_path"
```

---

## Task 4: The catalogue

**Files:** Create `supabase/migrations/0002_catalogue.sql`; Test `tests/schema/catalogue.test.ts`

**Interfaces:** Consumes `operator`. Produces `service_category`, `service`, `operator_service`, `salon_settings`.

- [ ] **Step 1: Write the failing test**

`tests/schema/catalogue.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CAT_NAILS, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('catalogue', () => {
  it('stores durations in cells', async () => {
    const rows = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string; d: number }>(
        'select name as n, default_duration_cells as d from service order by name',
      )
      return r.rows
    })
    expect(rows).toEqual([
      { n: 'Massaggio', d: 10 },   // 50 minutes
      { n: 'Refill gel', d: 18 },  // 90 minutes
    ])
  })

  it('refuses a service with a non-positive duration', async () => {
    await expect(
      asOwner((c) =>
        c.query(`insert into service (name, category_id, default_duration_cells) values ('Nulla', $1, 0)`, [CAT_NAILS]),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses a negative turnaround', async () => {
    await expect(
      asOwner((c) =>
        c.query(
          `insert into service (name, category_id, default_duration_cells, buffer_after_cells)
           values ('Negativo', $1, 6, -1)`,
          [CAT_NAILS],
        ),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses a per-operator duration override of zero', async () => {
    await expect(
      asOwner((c) =>
        c.query(`insert into operator_service (operator_id, service_id, duration_cells) values ($1, $2, 0)`, [
          VERA, SERVICE_MASSAGE,
        ]),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('leaves the override null so the service default applies', async () => {
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: number | null }>(
        'select duration_cells as d from operator_service where operator_id = $1 and service_id = $2',
        [VERA, SERVICE_REFILL],
      )
      return r.rows[0].d
    })
    expect(d).toBeNull()
  })

  it('accepts a per-operator override: Annalisa is slower than Vera', async () => {
    await asOwner((c) =>
      c.query('update operator_service set duration_cells = 24 where operator_id = $1 and service_id = $2', [
        ANNALISA, SERVICE_REFILL,
      ]),
    )
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: number }>(
        'select duration_cells as d from operator_service where operator_id = $1 and service_id = $2',
        [ANNALISA, SERVICE_REFILL],
      )
      return r.rows[0].d
    })
    expect(d).toBe(24) // 120 minutes against Vera's 90
  })

  it('holds exactly one row of salon settings', async () => {
    const row = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ s: number; e: number }>(
        'select day_start_boundary as s, day_end_boundary as e from salon_settings',
      )
      return { rows: r.rowCount, ...r.rows[0] }
    })
    expect(row).toEqual({ rows: 1, s: 96, e: 240 }) // 08:00 to 20:00
  })

  it('refuses a second row of salon settings', async () => {
    await expect(
      asOwner((c) => c.query('insert into salon_settings (day_start_boundary, day_end_boundary) values (100, 200)')),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/catalogue.test.ts`
Expected: FAIL — `relation "service_category" does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0002_catalogue.sql`:

```sql
-- Services, who performs them, and the salon's own hours. Spec §6.1.

create table service_category (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0
);

create table service (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  category_id            uuid not null references service_category (id),
  default_duration_cells smallint not null check (default_duration_cells > 0),
  -- Turnaround AFTER this service. Advisory: applied when proposing
  -- (spec §7.3), never as occupancy.
  buffer_after_cells     smallint not null default 0 check (buffer_after_cells >= 0),
  is_active              boolean not null default true,
  sort_order             integer not null default 0
);

create table operator_service (
  operator_id    uuid not null references operator (id) on delete cascade,
  service_id     uuid not null references service (id) on delete cascade,
  -- NULL means "use service.default_duration_cells". Spec D28.
  duration_cells smallint check (duration_cells > 0),
  primary key (operator_id, service_id)
);

-- Bounds the agenda's vertical extent. Spec §6.1, §9.1.
-- `id boolean primary key check (id)` admits exactly one row.
create table salon_settings (
  id                  boolean primary key default true check (id),
  day_start_boundary  smallint not null check (day_start_boundary between 0 and 288),
  day_end_boundary    smallint not null check (day_end_boundary between 0 and 288),
  check (day_end_boundary > day_start_boundary)
);

insert into salon_settings (day_start_boundary, day_end_boundary) values (96, 240);

alter table service_category enable row level security;
alter table service enable row level security;
alter table operator_service enable row level security;
alter table salon_settings enable row level security;

create policy service_category_access on service_category
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy service_access on service
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy operator_service_access on operator_service
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy salon_settings_access on salon_settings
  for all using (app.is_active_operator()) with check (app.is_active_operator());
```

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_catalogue.sql tests/schema/catalogue.test.ts
git commit -m "feat(db): service catalogue, per-operator durations and salon hours"
```

---

## Task 5: Clients

**Files:** Create `supabase/migrations/0003_client.sql`; Test `tests/schema/client.test.ts`

**Interfaces:** Consumes `operator`. Produces `client`; `public.immutable_unaccent(text)`.

- [ ] **Step 1: Write the failing test**

`tests/schema/client.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, seedFixture } from '../helpers/fixtures'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const add = (fields: string) => asOwner((c) => c.query(`insert into client ${fields}`))

describe('client', () => {
  it('accepts a client with no birthday at all', async () => {
    await add(`(full_name, phone) values ('Senza data', '+393330000000')`)
    const n = await asOperator(VERA_AUTH, async (c) => (await c.query('select id from client')).rowCount)
    expect(n).toBe(3) // two from the fixture plus this one
  })

  it('refuses a month without a day', async () => {
    await expect(add(`(full_name, birth_month) values ('Mezza data', 3)`)).rejects.toSatisfy(
      (e) => pgCode(e) === '23514',
    )
  })

  it('refuses a day without a month', async () => {
    await expect(add(`(full_name, birth_day) values ('Mezza data', 12)`)).rejects.toSatisfy(
      (e) => pgCode(e) === '23514',
    )
  })

  it('accepts 29 February', async () => {
    await add(`(full_name, birth_month, birth_day) values ('Bisestile', 2, 29)`)
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: number }>(`select birth_day as d from client where full_name = 'Bisestile'`)
      return r.rows[0].d
    })
    expect(d).toBe(29)
  })

  // Must REJECT, not raise: a date-construction check raises 22008, which no
  // form can handle. Spec §6.2.1.
  it.each([
    ['31 February', 2, 31],
    ['31 April', 4, 31],
  ])('rejects %s with a check violation, not an error', async (_l, m, d) => {
    await expect(
      add(`(full_name, birth_month, birth_day) values ('Impossibile', ${m}, ${d})`),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('stores last_activity_at as a date, not a timestamp', async () => {
    const t = await asOwner(async (c) => {
      const r = await c.query<{ t: string }>(`
        select data_type as t from information_schema.columns
        where table_name = 'client' and column_name = 'last_activity_at'
      `)
      return r.rows[0].t
    })
    expect(t).toBe('date')
  })

  it('records a preferred operator and a message opt-out', async () => {
    await asOwner((c) =>
      c.query('update client set preferred_operator_id = $1, no_messages = true where id = $2', [VERA, CLIENT_MARIA]),
    )
    const row = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ p: string; m: boolean }>(
        'select preferred_operator_id as p, no_messages as m from client where id = $1',
        [CLIENT_MARIA],
      )
      return r.rows[0]
    })
    expect(row).toEqual({ p: VERA, m: true })
  })

  it('clears the preferred operator when that operator row is deleted', async () => {
    const TEMP = '10000000-0000-4000-8000-000000000009'
    await asOwner(async (c) => {
      await c.query(`insert into operator (id, name, color) values ($1, 'Temp', '#000000')`, [TEMP])
      await c.query('update client set preferred_operator_id = $1 where id = $2', [TEMP, CLIENT_MARIA])
      await c.query('delete from operator where id = $1', [TEMP])
    })
    const p = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ p: string | null }>(
        'select preferred_operator_id as p from client where id = $1',
        [CLIENT_MARIA],
      )
      return r.rows[0].p
    })
    expect(p).toBeNull()
  })

  it('finds a client whose name differs by accent and case', async () => {
    const found = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string }>(
        `select full_name as n from client
         where immutable_unaccent(full_name) ilike '%' || immutable_unaccent($1) || '%'`,
        ['ciccare'],
      )
      return r.rows.map((x) => x.n)
    })
    expect(found).toEqual(['Lucia Ciccarè'])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/client.test.ts`
Expected: FAIL — `relation "client" does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0003_client.sql`:

```sql
-- Clients. Name, phone, a birthday without a year. Spec §6.2, D26.

create extension if not exists unaccent with schema extensions;

-- unaccent() is STABLE, not IMMUTABLE, so it cannot be indexed directly.
create function public.immutable_unaccent(text) returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create table client (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  phone                 text,
  -- The birth YEAR is deliberately not collected. Spec §6.2.1.
  birth_month           smallint check (birth_month between 1 and 12),
  birth_day             smallint check (birth_day between 1 and 31),
  preferred_operator_id uuid references operator (id) on delete set null,
  no_messages           boolean not null default false,
  created_at            timestamptz not null default now(),
  -- A date, never a timestamp: compared against a date in the retention sweep,
  -- and a timestamptz would drag that into the session's zone. Spec §6.2.2.
  last_activity_at      date,

  constraint client_birthday_pair check ((birth_month is null) = (birth_day is null)),
  -- Days-per-month with February at 29, so an impossible pair is REJECTED
  -- rather than raising a date-construction error. Spec §6.2.1.
  constraint client_birthday_real check (
    birth_month is null
    or birth_day <= (array[31,29,31,30,31,30,31,31,30,31,30,31])[birth_month]
  )
);

create index client_name_search on client (immutable_unaccent(full_name));
create index client_phone_search on client (phone);
create index client_birthday on client (birth_month, birth_day);

alter table client enable row level security;

create policy client_access on client
  for all using (app.is_active_operator()) with check (app.is_active_operator());
```

If `extensions.unaccent` does not resolve on the local image, find where the extension landed (`select extnamespace::regnamespace from pg_extension where extname = 'unaccent'`) and qualify to match. Record the change for Task 15.

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_client.sql tests/schema/client.test.ts
git commit -m "feat(db): client records, yearless birthdays and accent-insensitive search"
```

---

## Task 6: Visits and appointments

**Files:** Create `supabase/migrations/0004_visit_appointment.sql`; Test `tests/schema/visit-appointment.test.ts`

**Interfaces:** Consumes `client`, `operator`, `service`. Produces `visit (id, client_id, visit_date, updated_at)` with `unique (id, visit_date)`; `appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count, updated_at)` with `unique (id, operator_id, appointment_date)`; `app.touch_updated_at()`.

- [ ] **Step 1: Write the failing test**

`tests/schema/visit-appointment.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const VISIT = '50000000-0000-4000-8000-000000000001'
const APPT = '60000000-0000-4000-8000-000000000001'

beforeEach(async () => {
  await resetData()
  await seedFixture()
  await asOwner((c) =>
    c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [VISIT, CLIENT_MARIA, DAY_ONE]),
  )
})

const addAppointment = (id: string, startCell: number, cellCount: number, date = DAY_ONE) =>
  asOwner((c) =>
    c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, $6, $7)`,
      [id, VISIT, VERA, SERVICE_REFILL, date, startCell, cellCount],
    ),
  )

const updatedAt = (table: 'visit' | 'appointment', id: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ u: Date }>(`select updated_at as u from ${table} where id = $1`, [id])
    return r.rows[0].u.getTime()
  })

describe('visit and appointment', () => {
  it('stores an appointment at cell 120 for 18 cells (10:00, 90 minutes)', async () => {
    await addAppointment(APPT, 120, 18)
    const row = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ s: number; n: number }>('select start_cell as s, cell_count as n from appointment')
      return r.rows[0]
    })
    expect(row).toEqual({ s: 120, n: 18 })
  })

  it.each([0, -12])('refuses cell_count %i', async (count) => {
    await expect(addAppointment(APPT, 120, count)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses an appointment that would cross midnight', async () => {
    await expect(addAppointment(APPT, 285, 6)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('refuses an appointment whose date differs from its visit', async () => {
    await expect(addAppointment(APPT, 120, 18, DAY_TWO)).rejects.toSatisfy((e) => pgCode(e) === '23503')
  })

  it('carries the appointments when the visit moves to another date', async () => {
    await addAppointment(APPT, 120, 18)
    await asOwner((c) => c.query('update visit set visit_date = $1::date where id = $2', [DAY_TWO, VISIT]))
    const d = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ d: string }>('select appointment_date as d from appointment')
      return r.rows[0].d
    })
    expect(d).toBe(DAY_TWO)
  })

  // ⚠ discriminating: the defect that made erasure unexecutable in revision 3.
  it('deletes a client with visits and appointments in one statement', async () => {
    await addAppointment(APPT, 120, 18)
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    const counts = await asOwner(async (c) => {
      const r = await c.query<{ v: string; a: string }>(
        'select (select count(*) from visit) as v, (select count(*) from appointment) as a',
      )
      return r.rows[0]
    })
    expect(counts).toEqual({ v: '0', a: '0' })
  })

  // ⚠ discriminating: §10.2's lost-update design rests on these triggers.
  it('bumps updated_at when an appointment changes', async () => {
    await addAppointment(APPT, 120, 18)
    const before = await updatedAt('appointment', APPT)
    await asOwner((c) => c.query('update appointment set start_cell = 126 where id = $1', [APPT]))
    expect(await updatedAt('appointment', APPT)).toBeGreaterThan(before)
  })

  it('bumps updated_at when the visit changes', async () => {
    const before = await updatedAt('visit', VISIT)
    await asOwner((c) => c.query('update visit set visit_date = $1::date where id = $2', [DAY_TWO, VISIT]))
    expect(await updatedAt('visit', VISIT)).toBeGreaterThan(before)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/visit-appointment.test.ts`
Expected: FAIL — `relation "visit" does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0004_visit_appointment.sql`:

```sql
-- A visit groups the services of one trip to the salon. Spec §6.3, D23.

create table visit (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references client (id) on delete cascade,
  visit_date date not null,
  updated_at timestamptz not null default clock_timestamp(),
  unique (id, visit_date)
);

create table appointment (
  id               uuid primary key default gen_random_uuid(),
  visit_id         uuid not null,
  operator_id      uuid not null references operator (id),
  service_id       uuid not null references service (id),
  appointment_date date not null,
  start_cell       smallint not null check (start_cell between 0 and 287),
  cell_count       smallint not null check (cell_count > 0),
  updated_at       timestamptz not null default clock_timestamp(),

  constraint appointment_within_day check (start_cell + cell_count <= 288),

  -- The date is BOUND to the visit's. ON DELETE CASCADE is what makes a
  -- client's erasure executable: with NO ACTION, deleting a visit raised 23503
  -- and spec §11.3's promise described a failure.
  constraint appointment_visit_date_fk
    foreign key (visit_id, appointment_date)
    references visit (id, visit_date)
    on update cascade on delete cascade,

  unique (id, operator_id, appointment_date)
);

create index appointment_by_day on appointment (appointment_date, operator_id);
create index appointment_by_visit on appointment (visit_id);

-- security INVOKER: it only writes NEW, and elevating it would be gratuitous
-- in a schema whose Global Constraints make a point of definer discipline.
-- clock_timestamp(), not now(): now() is fixed for the transaction, so two
-- updates inside one transaction would compare equal.
create function app.touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end
$$;

create trigger appointment_touch before update on appointment
  for each row execute function app.touch_updated_at();
create trigger visit_touch before update on visit
  for each row execute function app.touch_updated_at();

alter table visit enable row level security;
alter table appointment enable row level security;

create policy visit_access on visit
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy appointment_access on appointment
  for all using (app.is_active_operator()) with check (app.is_active_operator());
```

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_visit_appointment.sql tests/schema/visit-appointment.test.ts
git commit -m "feat(db): visits and appointments bound by composite keys"
```

---

## Task 7: The occupancy guarantee

**Files:** Create `supabase/migrations/0005_occupancy.sql`; Test `tests/schema/occupancy.test.ts`

**Interfaces:** Consumes `appointment`. Produces `appointment_slot`; constraint `appointment_slot_unique`; `app.sync_appointment_slots()`; trigger `zz_sync_appointment_slots`.

- [ ] **Step 1: Write the failing test**

`tests/schema/occupancy.test.ts`:

```ts
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

  it('removes the cells when the appointment is deleted', async () => {
    await asOwner((c) => c.query('delete from appointment where id = $1', [APPT]))
    expect(await cellsOf(APPT)).toEqual([])
  })

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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/occupancy.test.ts`
Expected: FAIL — `relation "appointment_slot" does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0005_occupancy.sql`:

```sql
-- The occupancy guarantee. Spec §6.4, D17.

create table appointment_slot (
  appointment_id   uuid not null,
  operator_id      uuid not null,
  appointment_date date not null,
  cell_index       smallint not null check (cell_index between 0 and 287),

  primary key (appointment_id, cell_index),

  -- Measure 3. A CHECK cannot read another row, so drift is prevented by a
  -- composite key: the child cannot name an operator or date its parent does
  -- not have. ON DELETE CASCADE keeps deletion executable.
  constraint appointment_slot_parent_fk
    foreign key (appointment_id, operator_id, appointment_date)
    references appointment (id, operator_id, appointment_date)
    on update cascade on delete cascade
);

-- Measure 1. DEFERRABLE because within ONE statement the row-level AFTER
-- trigger fires per row, so the first row's inserts would collide with the
-- second row's not-yet-deleted cells. It does NOT make a swap across two
-- PostgREST calls possible — each call is its own transaction (spec §4.6).
alter table appointment_slot
  add constraint appointment_slot_unique
  unique (operator_id, appointment_date, cell_index)
  deferrable initially deferred;

-- Measure 4. All three events, NO column list, and the delete matches on
-- appointment_id ALONE: matching also on the cascaded columns would miss rows
-- the foreign key has already rewritten, after which the re-insert violates
-- the primary key and every reassignment fails.
--
-- Measured note (spec §6.4): the 'zz_' prefix is NOT load-bearing — renaming
-- the trigger changed nothing — and the composite key's ON UPDATE CASCADE
-- shadows much of what "no column list" protects. Both are kept as discipline:
-- the trigger must own its rows rather than leaving a cascade to repair them.
create function app.sync_appointment_slots() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.appointment_slot where appointment_id = old.id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.appointment_slot (appointment_id, operator_id, appointment_date, cell_index)
    select new.id, new.operator_id, new.appointment_date, g
    from generate_series(new.start_cell, new.start_cell + new.cell_count - 1) as g;
  end if;

  return null;
end
$$;

create trigger zz_sync_appointment_slots
  after insert or update or delete on appointment
  for each row execute function app.sync_appointment_slots();

-- Measure 2. INSERT/UPDATE/DELETE only: the application MUST read this table
-- (the availability query, the narrowing check, the conflict pre-check and the
-- day view all do). REVOKE ALL would have taken SELECT with it.
revoke insert, update, delete on appointment_slot from authenticated, anon;

alter table appointment_slot enable row level security;

create policy appointment_slot_read on appointment_slot
  for select using (app.is_active_operator());
```

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: ⚠ Prove the trigger is load-bearing**

In a scratch session run `alter table appointment disable trigger zz_sync_appointment_slots;`, then `npm test -- tests/schema/occupancy.test.ts`.

Expected to **FAIL**: *"realigns operator AND cells when both change at once"*, *"…shortened"*, *"…lengthened"*, *"…moves in time"*, and *"moves an appointment by less than its own duration"*. If any of them passes, it is measuring the foreign key's cascade rather than the trigger and must be rewritten before this task is done. Re-enable the trigger and reset.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0005_occupancy.sql tests/schema/occupancy.test.ts
git commit -m "feat(db): occupancy cells, deferred unique constraint and the sync trigger"
```

---

## Task 8: Availability

**Files:** Create `supabase/migrations/0006_availability.sql`; Test `tests/schema/availability.test.ts`

**Interfaces:** Consumes `operator`. Produces `weekly_availability`, `exception_day`, `exception_range`, `salon_closure`.

There is **no `is_absent` flag**: an `exception_day` replaces the day, and zero ranges means away (spec §6.5).

- [ ] **Step 1: Write the failing test**

`tests/schema/availability.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { DAY_ONE, seedFixture } from '../helpers/fixtures'

const EXC = '70000000-0000-4000-8000-000000000001'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const count = (table: string) =>
  asOperator(VERA_AUTH, async (c) => (await c.query(`select 1 from ${table}`)).rowCount)

const addWeekly = (operator: string, weekday: number, s: number, e: number) =>
  asOwner((c) =>
    c.query(
      `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary) values ($1, $2, $3, $4)`,
      [operator, weekday, s, e],
    ),
  )

describe('weekly availability', () => {
  it('stores a split shift as two ranges', async () => {
    // Thursday: isodow 4 - 1 = 3. 09:00-13:00 and 15:00-19:00.
    await addWeekly(VERA, 3, 108, 156)
    await addWeekly(VERA, 3, 180, 228)
    expect(await count('weekly_availability')).toBe(2)
  })

  it('accepts two touching ranges: folding is the resolver s job', async () => {
    await addWeekly(VERA, 3, 108, 144)
    await addWeekly(VERA, 3, 144, 180)
    expect(await count('weekly_availability')).toBe(2)
  })

  it('refuses two overlapping ranges for one operator and weekday', async () => {
    await addWeekly(VERA, 3, 108, 156)
    await expect(addWeekly(VERA, 3, 150, 200)).rejects.toSatisfy((e) => pgCode(e) === '23P01')
  })

  // ⚠ discriminating for the operator_id and weekday keys of the exclusion
  // constraint: with one operator and one weekday in play, a constraint that
  // ignored them would look identical.
  it('accepts the same range for a different operator', async () => {
    await addWeekly(VERA, 3, 108, 156)
    await addWeekly(ANNALISA, 3, 108, 156)
    expect(await count('weekly_availability')).toBe(2)
  })

  it('accepts the same range on a different weekday', async () => {
    await addWeekly(VERA, 3, 108, 156)
    await addWeekly(VERA, 4, 108, 156)
    expect(await count('weekly_availability')).toBe(2)
  })

  it.each([
    ['an end boundary beyond the day', 108, 400],
    ['an inverted range', 200, 100],
  ])('refuses %s', async (_l, s, e) => {
    await expect(addWeekly(VERA, 3, s, e)).rejects.toSatisfy((err) => pgCode(err) === '23514')
  })

  it('refuses a weekday outside Monday..Sunday', async () => {
    await expect(addWeekly(VERA, 7, 108, 156)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })
})

describe('exception days', () => {
  const addDay = () =>
    asOwner((c) =>
      c.query('insert into exception_day (id, operator_id, exception_date) values ($1, $2, $3::date)', [
        EXC, VERA, DAY_ONE,
      ]),
    )
  const addRange = (s: number, e: number) =>
    asOwner((c) =>
      c.query('insert into exception_range (exception_day_id, start_boundary, end_boundary) values ($1, $2, $3)', [
        EXC, s, e,
      ]),
    )

  it('holds at most one exception per operator and date', async () => {
    await addDay()
    await expect(
      asOwner((c) =>
        c.query('insert into exception_day (operator_id, exception_date) values ($1, $2::date)', [VERA, DAY_ONE]),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505')
  })

  it('allows the same date for a different operator', async () => {
    await addDay()
    await asOwner((c) =>
      c.query('insert into exception_day (operator_id, exception_date) values ($1, $2::date)', [ANNALISA, DAY_ONE]),
    )
    expect(await count('exception_day')).toBe(2)
  })

  it('treats an exception day with no ranges as away', async () => {
    await addDay()
    expect(await count('exception_range')).toBe(0)
  })

  it('refuses overlapping ranges within one exception day', async () => {
    await addDay()
    await addRange(180, 204)
    await expect(addRange(190, 220)).rejects.toSatisfy((e) => pgCode(e) === '23P01')
  })

  it('refuses an exception range beyond the day', async () => {
    await addDay()
    await expect(addRange(0, 30000)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })

  it('removes the ranges with the exception day', async () => {
    await addDay()
    await addRange(180, 204)
    await asOwner((c) => c.query('delete from exception_day where id = $1', [EXC]))
    expect(await count('exception_range')).toBe(0)
  })
})

describe('salon closures', () => {
  // NOTE: every negative case below supplies `reason`. Omitting it raises
  // 23502 (not-null) BEFORE the check constraints, so the test would fail on a
  // typo while the constraint under test stayed unmeasured.
  const close = (sql: string) => asOwner((c) => c.query(`insert into salon_closure ${sql}`))

  it('stores a whole-day closure spanning a fortnight', async () => {
    await close(`(start_date, end_date, reason) values (date '2026-08-10', date '2026-08-24', 'Ferie')`)
    const r = await asOperator(VERA_AUTH, async (c) => {
      const q = await c.query<{ r: string }>('select reason as r from salon_closure')
      return q.rows[0].r
    })
    expect(r).toBe('Ferie')
  })

  // Spec §6.5 builds this deliberately. §13.2 had listed it as something to
  // reject; §6.5 is the side that is right, and the spec was corrected.
  it('stores a partial closure across several dates', async () => {
    await close(
      `(start_date, end_date, from_boundary, to_boundary, reason)
       values (date '2026-12-24', date '2026-12-25', 156, 288, 'Chiusura pomeridiana')`,
    )
    expect(await count('salon_closure')).toBe(1)
  })

  it.each([
    ['one boundary without the other', `(start_date, end_date, from_boundary, reason) values (date '2026-12-24', date '2026-12-24', 156, 'x')`],
    ['an inverted window', `(start_date, end_date, from_boundary, to_boundary, reason) values (date '2026-12-24', date '2026-12-24', 200, 100, 'x')`],
    ['a boundary beyond the day', `(start_date, end_date, from_boundary, to_boundary, reason) values (date '2026-12-24', date '2026-12-24', 100, 400, 'x')`],
    ['an end date before the start date', `(start_date, end_date, reason) values (date '2026-08-24', date '2026-08-10', 'x')`],
  ])('refuses %s', async (_l, sql) => {
    await expect(close(sql)).rejects.toSatisfy((e) => pgCode(e) === '23514')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/availability.test.ts`
Expected: FAIL — `relation "weekly_availability" does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0006_availability.sql`:

```sql
-- Availability: the typical week, per-date exceptions, salon closures.
-- Spec §6.5, D5, D6.

create table weekly_availability (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references operator (id) on delete cascade,
  weekday        smallint not null check (weekday between 0 and 6), -- 0 = Monday
  start_boundary smallint not null check (start_boundary between 0 and 288),
  end_boundary   smallint not null check (end_boundary between 0 and 288),
  check (end_boundary > start_boundary),

  -- Enforced, not prose. Touching ranges stay legal; folding them is the
  -- resolver's job (spec §7.1 step 4).
  exclude using gist (
    operator_id with =,
    weekday with =,
    int4range(start_boundary, end_boundary) with &&
  )
);

-- An exception replaces the day. ZERO RANGES MEANS AWAY: there is no flag,
-- because a flag made "not absent with no ranges" resolve identically to
-- "absent" — one meaning with two spellings. Spec §6.5.
create table exception_day (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references operator (id) on delete cascade,
  exception_date date not null,
  unique (operator_id, exception_date)
);

create table exception_range (
  id               uuid primary key default gen_random_uuid(),
  exception_day_id uuid not null references exception_day (id) on delete cascade,
  start_boundary   smallint not null check (start_boundary between 0 and 288),
  end_boundary     smallint not null check (end_boundary between 0 and 288),
  check (end_boundary > start_boundary),

  -- Keyed on exception_day_id: this table has neither operator_id nor weekday.
  exclude using gist (
    exception_day_id with =,
    int4range(start_boundary, end_boundary) with &&
  )
);

create table salon_closure (
  id             uuid primary key default gen_random_uuid(),
  start_date     date not null,
  end_date       date not null,
  -- Both null: whole days. Both set: this window is cut out of EVERY date in
  -- the range, which is how a week of reduced hours is expressed.
  from_boundary  smallint check (from_boundary between 0 and 288),
  to_boundary    smallint check (to_boundary between 0 and 288),
  reason         text not null,

  check (end_date >= start_date),
  constraint salon_closure_boundary_pair check ((from_boundary is null) = (to_boundary is null)),
  constraint salon_closure_boundary_order check (to_boundary is null or to_boundary > from_boundary)
);

create index exception_day_lookup on exception_day (operator_id, exception_date);
create index salon_closure_lookup on salon_closure (start_date, end_date);

alter table weekly_availability enable row level security;
alter table exception_day enable row level security;
alter table exception_range enable row level security;
alter table salon_closure enable row level security;

create policy weekly_availability_access on weekly_availability
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy exception_day_access on exception_day
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy exception_range_access on exception_range
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy salon_closure_access on salon_closure
  for all using (app.is_active_operator()) with check (app.is_active_operator());
```

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_availability.sql tests/schema/availability.test.ts
git commit -m "feat(db): weekly availability, flagless exception days and salon closures"
```

---

## Task 9: `last_activity_at`

**Files:** Create `supabase/migrations/0007_client_activity.sql`; Test `tests/schema/client-activity.test.ts`

**Interfaces:** Consumes `client`, `visit`, `appointment`. Produces `app.touch_client_activity()`; trigger `zz_touch_client_activity` on `appointment` and on `visit`.

This value decides which personal data is deleted.

- [ ] **Step 1: Write the failing test**

`tests/schema/client-activity.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { VERA, VERA_AUTH, asOperator, asOwner, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const VISIT = '50000000-0000-4000-8000-000000000001'
const APPT = '60000000-0000-4000-8000-000000000001'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const activity = (clientId: string) =>
  asOperator(VERA_AUTH, async (c) => {
    const r = await c.query<{ a: string | null }>('select last_activity_at as a from client where id = $1', [clientId])
    return r.rows[0].a
  })

async function book(date: string, clientId = CLIENT_MARIA) {
  await asOwner(async (c) => {
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [VISIT, clientId, date])
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 18)`,
      [APPT, VISIT, VERA, SERVICE_REFILL, date],
    )
  })
}

describe('client activity', () => {
  it('is null for a client who has never booked', async () => {
    expect(await activity(CLIENT_MARIA)).toBeNull()
  })

  it('is set when an appointment is created', async () => {
    await book(DAY_ONE)
    expect(await activity(CLIENT_MARIA)).toBe(DAY_ONE)
  })

  it('leaves the other client untouched', async () => {
    await book(DAY_ONE)
    expect(await activity(CLIENT_LUCIA)).toBeNull()
  })

  it('follows the visit when the visit date changes', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query(`update visit set visit_date = date '2027-01-15' where id = $1`, [VISIT]))
    expect(await activity(CLIENT_MARIA)).toBe('2027-01-15')
  })

  // ⚠ discriminating: the ONLY branch the visit-side trigger alone can serve.
  // A visit-DATE change cascades onto appointment and fires that trigger too,
  // so it measures nothing here; reassigning the visit to another client does,
  // and it must update BOTH clients.
  it('moves the activity when a visit is reassigned to another client', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query('update visit set client_id = $1 where id = $2', [CLIENT_LUCIA, VISIT]))
    expect(await activity(CLIENT_MARIA)).toBeNull()
    expect(await activity(CLIENT_LUCIA)).toBe(DAY_ONE)
  })

  it('survives an appointment moving within the same visit', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query('update appointment set start_cell = 150 where id = $1', [APPT]))
    expect(await activity(CLIENT_MARIA)).toBe(DAY_ONE)
  })

  it('recomputes downward when the appointment is deleted', async () => {
    await book(DAY_ONE)
    await asOwner((c) => c.query('delete from appointment where id = $1', [APPT]))
    expect(await activity(CLIENT_MARIA)).toBeNull()
  })

  it('counts a future visit, so a client who has just rebooked is not swept', async () => {
    await book('2027-06-01')
    expect(await activity(CLIENT_MARIA)).toBe('2027-06-01')
  })

  it('keeps the greatest date across two visits', async () => {
    await book(DAY_ONE)
    await asOwner(async (c) => {
      const V2 = '50000000-0000-4000-8000-000000000002'
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V2, CLIENT_MARIA, DAY_TWO])
      await c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 120, 18)`,
        [V2, VERA, SERVICE_REFILL, DAY_TWO],
      )
    })
    expect(await activity(CLIENT_MARIA)).toBe(DAY_TWO)
  })

  // ⚠ discriminating: an AGED client with a null activity date. A client
  // created today is not eligible either way, so the previous version of this
  // test could not tell the coalesce from its absence.
  it('makes an aged, never-booked client eligible through created_at', async () => {
    await asOwner((c) =>
      c.query(`insert into client (full_name, created_at) values ('Dimenticata', now() - interval '30 months')`),
    )
    const eligible = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string }>(`
        select count(*) as n from client
        where coalesce(last_activity_at, created_at::date) < current_date - interval '24 months'
      `)
      return Number(r.rows[0].n)
    })
    expect(eligible).toBe(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/client-activity.test.ts`
Expected: FAIL — `last_activity_at` stays null after booking.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0007_client_activity.sql`:

```sql
-- last_activity_at: the value the retention sweep deletes on. Spec §6.2.2.

create function app.touch_client_activity() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid[];
begin
  if tg_table_name = 'visit' then
    affected := array_remove(array[
      (case when tg_op in ('INSERT', 'UPDATE') then new.client_id end),
      (case when tg_op in ('UPDATE', 'DELETE') then old.client_id end)
    ], null);
  else
    affected := array_remove(array[
      (select v.client_id from public.visit v
        where v.id = (case when tg_op in ('INSERT', 'UPDATE') then new.visit_id end)),
      (select v.client_id from public.visit v
        where v.id = (case when tg_op in ('UPDATE', 'DELETE') then old.visit_id end))
    ], null);
  end if;

  update public.client c
  set last_activity_at = (
    -- Future visits included: a dormant client who has just rebooked must not
    -- become eligible and be swept before she arrives.
    select max(v.visit_date)
    from public.visit v
    join public.appointment a on a.visit_id = v.id
    where v.client_id = c.id
  )
  where c.id = any(affected);

  return null;
end
$$;

create trigger zz_touch_client_activity
  after insert or update or delete on appointment
  for each row execute function app.touch_client_activity();

create trigger zz_touch_client_activity
  after insert or update or delete on visit
  for each row execute function app.touch_client_activity();
```

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: ⚠ Prove the visit-side trigger is load-bearing**

In a scratch session run `drop trigger zz_touch_client_activity on visit;`, then `npm test -- tests/schema/client-activity.test.ts`.

Expected: *"moves the activity when a visit is reassigned to another client"* **FAILS**. The others may still pass, because a visit-date change cascades onto `appointment` and fires that trigger instead. If nothing fails, the visit trigger is dead code and the test must be rewritten. Reset afterwards.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0007_client_activity.sql tests/schema/client-activity.test.ts
git commit -m "feat(db): maintain last_activity_at from both visits and appointments"
```

---

## Task 10: The orphan-visit guard

**Files:** Create `supabase/migrations/0008_orphan_visit.sql`; Test `tests/schema/orphan-visit.test.ts`

**Interfaces:** Consumes `visit`, `appointment`. Produces `app.delete_orphan_visit()`; trigger `zz_delete_orphan_visit`.

- [ ] **Step 1: Write the failing test**

`tests/schema/orphan-visit.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/orphan-visit.test.ts`
Expected: FAIL — the visit survives.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0008_orphan_visit.sql`:

```sql
-- An orphan visit is impossible. Spec §6.3.
--
-- The ROW LOCK is the whole mechanism. Without it, two operators deleting the
-- two halves concurrently each still see the other's uncommitted survivor,
-- neither deletes, and the orphan's future date keeps its client out of the
-- retention sweep for ever. Moving logic into the database does not serialise
-- it; taking a lock does.

create function app.delete_orphan_visit() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked uuid;
begin
  select v.id into locked
  from public.visit v
  where v.id = old.visit_id
  for update;

  if locked is null then
    return null; -- already gone: a cascade from client deletion
  end if;

  if not exists (select 1 from public.appointment a where a.visit_id = locked) then
    delete from public.visit where id = locked;
  end if;

  return null;
end
$$;

create trigger zz_delete_orphan_visit
  after delete on appointment
  for each row execute function app.delete_orphan_visit();
```

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: ⚠ Prove the lock is load-bearing**

Remove `for update` from the `select ... into locked`, reset, run `orphan-visit.test.ts`.

Expected: *"removes the visit when the two deletions overlap"* **FAILS** — the visit survives. Restore, reset, confirm green. If it does not fail, the test is not concurrent and must be rewritten.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0008_orphan_visit.sql tests/schema/orphan-visit.test.ts
git commit -m "feat(db): serialise the orphan-visit guard with a row lock"
```

---

## Task 11: The lockout guard

**Files:** Create `supabase/migrations/0009_operator_guard.sql`; Test `tests/schema/operator-guard.test.ts`

**Interfaces:** Consumes `operator`. Produces `app.guard_operator_lockout()`; constraint trigger `operator_lockout_guard`.

- [ ] **Step 1: Write the failing test**

`tests/schema/operator-guard.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/operator-guard.test.ts`
Expected: FAIL — every update succeeds.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0009_operator_guard.sql`:

```sql
-- The salon cannot be locked out of its own database. Spec §6.1.
--
-- Guards BOTH is_active and auth_user_id: access needs each of them, so
-- pressing "scollega" produces the identical lockout as deactivating.
--
-- ORDER BY id is not decoration. Without a deterministic lock order, two
-- sessions updating different operator rows each hold their target and then
-- try to lock the rest: measured 40P01, a deadlock, instead of the sentence.

create function app.guard_operator_lockout() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining integer;
begin
  perform 1 from public.operator order by id for update;

  select count(*) into remaining
  from public.operator o
  where o.is_active and o.auth_user_id is not null;

  if remaining = 0 then
    raise exception 'refused: this would leave no last active operator linked to an account'
      using errcode = 'check_violation';
  end if;

  return null;
end
$$;

-- A constraint trigger, so the check can be deferred if a future migration
-- ever needs it. An ordinary AFTER ... FOR EACH ROW trigger already fires at
-- end of statement; deferrability is the only thing this form adds.
create constraint trigger operator_lockout_guard
  after update or delete on operator
  deferrable initially immediate
  for each row execute function app.guard_operator_lockout();
```

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: ⚠ Prove the ordered lock is load-bearing**

Change `order by id for update` to `where true for update`, reset, run `operator-guard.test.ts`.

Expected: the mutual-deactivation test **FAILS** with `40P01`. Restore, reset, confirm green.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0009_operator_guard.sql tests/schema/operator-guard.test.ts
git commit -m "feat(db): lockout guard with an ordered row lock"
```

---

## Task 12: Transactional write functions

**Files:** Create `supabase/migrations/0010_write_functions.sql`; Test `tests/schema/write-functions.test.ts`

**Interfaces:** Consumes everything above. Produces
`public.move_visit(uuid, date, integer) returns void`,
`public.swap_appointment_operators(uuid, uuid) returns void`,
`public.write_exception_day(uuid, date, int[][]) returns uuid`,
`public.write_exception_days(uuid, date, date, int[][]) returns integer`.

- [ ] **Step 1: Write the failing test**

`tests/schema/write-functions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, VERA, VERA_AUTH, asAnon, asOperator, asOwner, connect, pgCode, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const V1 = '50000000-0000-4000-8000-000000000001'
const V2 = '50000000-0000-4000-8000-000000000002'
const A1 = '60000000-0000-4000-8000-000000000001'
const A2 = '60000000-0000-4000-8000-000000000002'
const A3 = '60000000-0000-4000-8000-000000000003'

beforeEach(async () => {
  await resetData()
  await seedFixture()
  await asOwner(async (c) => {
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V1, CLIENT_MARIA, DAY_ONE])
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V2, CLIENT_LUCIA, DAY_ONE])
    // Vera: manicure 120-131 and pedicure 132-143 in one visit.
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 12), ($6, $2, $3, $4, $5::date, 132, 12)`,
      [A1, V1, VERA, SERVICE_REFILL, DAY_ONE, A2],
    )
    // Annalisa: the same cells as the manicure, different visit.
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values ($1, $2, $3, $4, $5::date, 120, 12)`,
      [A3, V2, ANNALISA, SERVICE_REFILL, DAY_ONE],
    )
  })
})

const startsOf = (visit: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ s: number }>(
      'select start_cell as s from appointment where visit_id = $1 order by start_cell',
      [visit],
    )
    return r.rows.map((x) => x.s)
  })

describe('move_visit', () => {
  // ⚠ discriminating: THE case that fails as two separate calls.
  it('shifts a two-service visit by 30 minutes in one transaction', async () => {
    await asOwner((c) => c.query('select move_visit($1, $2::date, $3)', [V1, DAY_ONE, 6]))
    expect(await startsOf(V1)).toEqual([126, 138])
  })

  it('is callable by the application role', async () => {
    const seen = await asOperator(VERA_AUTH, async (c) => {
      await c.query('select move_visit($1, $2::date, $3)', [V1, DAY_ONE, 6])
      const r = await c.query<{ s: number }>(
        'select start_cell as s from appointment where visit_id = $1 order by start_cell',
        [V1],
      )
      return r.rows.map((x) => x.s)
    })
    expect(seen).toEqual([126, 138])
  })

  it('moves a whole visit to another date', async () => {
    await asOwner((c) => c.query('select move_visit($1, $2::date, 0)', [V1, DAY_TWO]))
    const dates = await asOwner(async (c) => {
      const r = await c.query<{ d: string }>(
        'select distinct appointment_date as d from appointment where visit_id = $1',
        [V1],
      )
      return r.rows.map((x) => x.d)
    })
    expect(dates).toEqual([DAY_TWO])
  })

  // ⚠ discriminating for `set constraints all immediate`: inside an EXPLICIT
  // transaction the deferred constraint would otherwise stay silent until
  // commit. Under autocommit both behaviours look identical.
  it('reports a collision inside the transaction, not at commit', async () => {
    const c = await connect()
    try {
      await c.query('begin')
      // Park a Vera appointment on cells 144-155, where the visit's pedicure
      // lands once the visit shifts by an hour.
      await c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4::date, 144, 12)`,
        [V2, VERA, SERVICE_REFILL, DAY_ONE],
      )
      // Shift V1 by 12 cells: manicure 120->132, pedicure 132->144. Collision.
      await expect(c.query('select move_visit($1, $2::date, 12)', [V1, DAY_ONE])).rejects.toSatisfy(
        (e) => pgCode(e) === '23505',
      )
    } finally {
      await c.query('rollback').catch(() => {})
      await c.end()
    }
  })
})

describe('swap_appointment_operators', () => {
  it('swaps two appointments that occupy the same cells', async () => {
    await asOwner((c) => c.query('select swap_appointment_operators($1, $2)', [A1, A3]))
    const owners = await asOwner(async (c) => {
      const r = await c.query<{ id: string; o: string }>(
        'select id, operator_id as o from appointment where id = any($1)',
        [[A1, A3]],
      )
      return Object.fromEntries(r.rows.map((x) => [x.id, x.o]))
    })
    expect(owners[A1]).toBe(ANNALISA)
    expect(owners[A3]).toBe(VERA)
  })

  // ⚠ discriminating: the same swap as two separate calls must fail. This is
  // the measurement behind D29.
  it('cannot be done as two separate calls', async () => {
    await expect(
      asOwner((c) => c.query('update appointment set operator_id = $1 where id = $2', [ANNALISA, A1])),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505')
  })
})

describe('write_exception_day', () => {
  const rangesOf = (dayId: string) =>
    asOwner(async (c) => {
      const r = await c.query<{ s: number; e: number }>(
        'select start_boundary as s, end_boundary as e from exception_range where exception_day_id = $1 order by s',
        [dayId],
      )
      return r.rows
    })

  it('writes the day and its ranges together', async () => {
    const id = await asOwner(async (c) => {
      const r = await c.query<{ id: string }>(`select write_exception_day($1, $2::date, array[[180, 204]]) as id`, [
        VERA, DAY_ONE,
      ])
      return r.rows[0].id
    })
    expect(await rangesOf(id)).toEqual([{ s: 180, e: 204 }])
  })

  it.each([
    ['null', null],
    ['an empty array', '{}'],
  ])('writes an absence when the ranges are %s', async (_l, ranges) => {
    const id = await asOwner(async (c) => {
      const r = await c.query<{ id: string }>(`select write_exception_day($1, $2::date, $3::int[]) as id`, [
        VERA, DAY_ONE, ranges,
      ])
      return r.rows[0].id
    })
    expect(await rangesOf(id)).toEqual([])
  })

  it('replaces the previous exception for the same date', async () => {
    await asOwner((c) => c.query(`select write_exception_day($1, $2::date, array[[180, 204]])`, [VERA, DAY_ONE]))
    const id = await asOwner(async (c) => {
      const r = await c.query<{ id: string }>(`select write_exception_day($1, $2::date, array[[108, 156]]) as id`, [
        VERA, DAY_ONE,
      ])
      return r.rows[0].id
    })
    expect(await rangesOf(id)).toEqual([{ s: 108, e: 156 }])
  })

  // ⚠ discriminating: atomicity. A bad range must leave neither the day nor
  // the ranges — otherwise a half-written call marks the operator away all day,
  // indistinguishable from a deliberate absence.
  it('leaves nothing behind when a range is invalid', async () => {
    await expect(
      asOwner((c) => c.query(`select write_exception_day($1, $2::date, array[[180, 30000]])`, [VERA, DAY_ONE])),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514')
    const n = await asOwner(async (c) => (await c.query('select 1 from exception_day')).rowCount)
    expect(n).toBe(0)
  })

  it('writes a fortnight of absence in one call', async () => {
    const written = await asOwner(async (c) => {
      const r = await c.query<{ n: number }>(
        `select write_exception_days($1, date '2026-08-10', date '2026-08-23', null) as n`,
        [VERA],
      )
      return r.rows[0].n
    })
    expect(written).toBe(14)
  })
})

describe('write function privileges', () => {
  it.each([
    'move_visit(null, null, null)',
    'swap_appointment_operators(null, null)',
    'write_exception_day(null, null, null)',
    'write_exception_days(null, null, null, null)',
  ])('refuses %s to an unauthenticated caller', async (call) => {
    await expect(asAnon((c) => c.query(`select ${call}`))).rejects.toSatisfy((e) => pgCode(e) === '42501')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/write-functions.test.ts`
Expected: FAIL — `function move_visit(...) does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0010_write_functions.sql`:

```sql
-- Transactional writes. Spec §4.6, D29.
--
-- On PostgREST every call is its own transaction, so a deferred constraint
-- buys nothing ACROSS calls: moving a two-service visit as two updates fails
-- every time, because the first update's new cells collide with the second
-- appointment's untouched ones. These functions ARE the transaction.
--
-- Each ends with SET CONSTRAINTS ALL IMMEDIATE so a violation surfaces HERE,
-- catchable and nameable (spec §10.1), rather than at COMMIT as an opaque
-- error. It is the last statement, because afterwards the constraint stays
-- immediate for the rest of the transaction.
--
-- security INVOKER throughout: they run under the caller's row-level security,
-- not above it.

create function public.move_visit(
  p_visit_id    uuid,
  p_new_date    date,
  p_shift_cells integer
) returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  update visit set visit_date = p_new_date where id = p_visit_id;

  if p_shift_cells <> 0 then
    update appointment
    set start_cell = start_cell + p_shift_cells
    where visit_id = p_visit_id;
  end if;

  set constraints all immediate;
end
$$;

create function public.swap_appointment_operators(p_a uuid, p_b uuid) returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  op_a uuid;
  op_b uuid;
begin
  -- Ordered, for the same reason as the lockout guard.
  perform 1 from appointment where id in (p_a, p_b) order by id for update;

  select operator_id into op_a from appointment where id = p_a;
  select operator_id into op_b from appointment where id = p_b;

  update appointment set operator_id = op_b where id = p_a;
  update appointment set operator_id = op_a where id = p_b;

  set constraints all immediate;
end
$$;

-- An exception day and its ranges in ONE transaction: two calls would mean a
-- request that hangs after the first leaves the operator marked away all day,
-- indistinguishable from a deliberate absence. Spec §6.5.
-- p_ranges is an N x 2 array of [start_boundary, end_boundary]; null OR EMPTY
-- means away.
create function public.write_exception_day(
  p_operator_id uuid,
  p_date        date,
  p_ranges      int[][]
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_day_id uuid;
  i integer;
  n integer;
begin
  delete from exception_day
  where operator_id = p_operator_id and exception_date = p_date;

  insert into exception_day (operator_id, exception_date)
  values (p_operator_id, p_date)
  returning id into v_day_id;

  -- array_length of an empty array is NULL, so this covers both the null and
  -- the empty case the comment above promises.
  n := coalesce(array_length(p_ranges, 1), 0);
  for i in 1 .. n loop
    insert into exception_range (exception_day_id, start_boundary, end_boundary)
    values (v_day_id, p_ranges[i][1], p_ranges[i][2]);
  end loop;

  return v_day_id;
end
$$;

-- Bulk absence over a date range. Spec §6.5: two weeks of holiday entered one
-- date at a time guarantees a missed day that leaves the operator bookable.
create function public.write_exception_days(
  p_operator_id uuid,
  p_from        date,
  p_to          date,
  p_ranges      int[][]
) returns integer
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  d date;
  written integer := 0;
begin
  for d in select generate_series(p_from, p_to, interval '1 day')::date loop
    perform write_exception_day(p_operator_id, d, p_ranges);
    written := written + 1;
  end loop;
  return written;
end
$$;

-- Supabase grants EXECUTE on new public functions to anon by default, and
-- swap_appointment_operators takes row locks BEFORE row-level security filters
-- anything: an unauthenticated caller could hold locks on appointment rows.
revoke execute on function
  public.move_visit(uuid, date, integer),
  public.swap_appointment_operators(uuid, uuid),
  public.write_exception_day(uuid, date, int[]),
  public.write_exception_days(uuid, date, date, int[])
from public, anon;

grant execute on function
  public.move_visit(uuid, date, integer),
  public.swap_appointment_operators(uuid, uuid),
  public.write_exception_day(uuid, date, int[]),
  public.write_exception_days(uuid, date, date, int[])
to authenticated;
```

If a `revoke`/`grant` signature fails to resolve, print the canonical form with `\df public.*` and use it verbatim — Postgres normalises `int[][]` to `integer[]`.

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: ⚠ Prove `set constraints all immediate` is load-bearing**

Delete that statement from `move_visit`, reset, run `write-functions.test.ts`.

Expected: *"reports a collision inside the transaction, not at commit"* **FAILS** — the call resolves and the error would surface only at commit. Restore, reset, confirm green.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0010_write_functions.sql tests/schema/write-functions.test.ts
git commit -m "feat(db): transactional functions for visit moves, swaps and exception days"
```

---

## Task 13: The account directory

**Files:** Create `supabase/migrations/0011_account_directory.sql`; Test `tests/schema/account-directory.test.ts`

**Interfaces:** Consumes `operator` and the `auth.users` rows created by `supabase/seed.sql`. Produces `public.list_auth_accounts() returns table (id uuid, email text)`.

Spec §9.9. Without it the Settings screen cannot link an operator to an account, and D30's escape route does not exist.

- [ ] **Step 1: Write the failing test**

`tests/schema/account-directory.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { OUTSIDER_AUTH, VERA_AUTH, asAnon, asOperator, resetData } from '../helpers/db'

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

  it('is not callable at all by an unauthenticated visitor', async () => {
    await expect(asAnon((c) => c.query('select * from list_auth_accounts()'))).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/schema/account-directory.test.ts`
Expected: FAIL — `function list_auth_accounts() does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0011_account_directory.sql`:

```sql
-- Linking an operator to an account needs auth.users ids, which the
-- application role cannot read. Spec §9.9.
--
-- Returns ONLY id and email — never a password hash, never a token — and
-- returns nothing unless the caller is an active operator, because
-- security definer otherwise hands auth.users to anyone who can call it.

create function public.list_auth_accounts()
returns table (id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_active_operator() then
    return;
  end if;

  return query
    select u.id, u.email::text
    from auth.users u
    order by u.email;
end
$$;

revoke execute on function public.list_auth_accounts() from public, anon;
grant execute on function public.list_auth_accounts() to authenticated;
```

If this raises `42501` reading `auth.users`, the migration role lacks that grant in the environment: record it as an environment prerequisite rather than loosening the function.

- [ ] **Step 4: Apply and run the whole suite**

```bash
npx supabase db reset
npm test
```

Expected: PASS.

- [ ] **Step 5: ⚠ Prove the operator guard is load-bearing**

Remove the `if not app.is_active_operator() then return; end if;` block, reset, run `account-directory.test.ts`.

Expected: *"returns nothing to an authenticated account that is not an operator"* **FAILS** — the outsider sees every account. Restore, reset, confirm green.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0011_account_directory.sql tests/schema/account-directory.test.ts
git commit -m "feat(db): expose auth account ids to active operators for linking"
```

---

## Task 14: Cold-start gate and CI

**Files:** Create `.github/workflows/ci.yml`

- [ ] **Step 1: Prove it from a cold start**

```bash
npx supabase db reset && npm test
```

Expected: every test passes against a database built from migrations and seed alone. Any test that depended on state left by a previous test fails here, which is the point.

**Corrected during Task 15, and this is why.** This step originally read `npx supabase stop` / `npx supabase start` / `npm test`, with the note that "`supabase start` already applies migrations and the seed; `db reset` is only needed after editing a migration". Measured: **`npx supabase stop` keeps a backup volume by default** (`"backup":true`), so `start` restores the previous, test-mutated database instead of rebuilding from migrations and seed — silently defeating the gate this step exists to be. `stop --no-backup` works too; `db reset` has no volume semantics to get wrong, so it is the form used here. The superseded wording is kept in this paragraph rather than deleted.

- [ ] **Step 2: Write the CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]

jobs:
  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx supabase start
      - run: npm test
```

CI runs in UTC and the developer's machine does not. The date-parser line in `tests/helpers/db.ts` is what keeps the two agreeing; if a date assertion ever fails on one and passes on the other, that line is the first place to look.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build the database from migrations and run the schema suite"
```

---

## Task 15: Reconcile the spec with what the tests proved

**Files:**
- Modify: `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`
- Create: `docs/superpowers/plans/2026-09-17-foundations-findings.md`

Spec §15: *"Where a statement here and a passing test disagree, the test wins and this document is corrected."*

- [ ] **Step 1: Collect every divergence**

Known before execution — start here and add whatever the run reveals:

1. `app` schema usage is granted to `anon` as well as `authenticated`.
2. `service_category`, `salon_settings` and the four write functions exist; the spec's §6 table count must match the database.
3. `salon_closure.reason` is `not null`, which the spec does not state.
4. `updated_at` uses `clock_timestamp()`, and `visit` carries one too.
5. `app.touch_updated_at()` is `security invoker`, unlike every other trigger function here.
6. `write_exception_days` (bulk absence) exists; the spec describes the behaviour in §6.5 and §9.8 but names no function.
7. `immutable_unaccent` is defined against whichever schema holds the extension.
8. The `revoke ... from anon` on the four write functions, which the spec does not mention.
9. Whatever the `auth.users` and extension-schema fallbacks in Tasks 2 and 5 forced.

For each: what the spec says, what the migration does, and **which test decided it**.

- [ ] **Step 2: Write the findings note**

`docs/superpowers/plans/2026-09-17-foundations-findings.md`, one section per divergence in that format. This is the audit trail that lets the next reader tell a deliberate change from a drift.

- [ ] **Step 3: Correct the spec**

Apply each divergence, bump to revision 5, and add a line to the header block saying revision 5 reconciles the document with the migrations of this plan. Do **not** rewrite the reasoning paragraphs — they explain why each safeguard exists and remain true.

- [ ] **Step 4: Verify the table count against the database, not against a regex**

```bash
npx supabase db reset >/dev/null
psql "${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" -At -c "
  select count(*) from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'"
```

(Catalogue inspection, which the Global Constraints permit: it does not read through row-level security.)

Confirm the spec's §6 opening sentence names that same number in words. An earlier version of this step counted bold-backtick line starts with `grep`, which also matched prose in §7 and would have sent the engineer to "fix" a correct section.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: reconcile the specification with the schema the tests proved"
```

---

## Self-review

**Spec coverage.** Tasks 2–13 carry §4.2, §4.3, §4.6, §6.1–§6.5 and the database-facing bullets of §13.2 and §13.3.

**§6.6 (precedence) has no task, deliberately** — it is resolution logic with no schema surface and belongs to plan 2. An earlier draft of this self-review claimed §6.6 was covered. It is not, and claiming coverage that does not exist is the failure this plan is built to stop.

**Deliberately deferred, each because it needs application code:** §7's resolution and proposal functions and §13.1's pure-function cases (plan 2); §8's flows, §9's screens, §10's messages and §13.4's end-to-end paths (plan 3); §11.3's per-client export, §11.4's retention sweep and §11.5's export action (plan 4). §4.4's middleware sign-out and server-action re-check are plan 3 — the database half is proved here. §6.2's E.164 normalisation is a write-path concern for plan 3; the column and index exist here. §5.2's `extract(isodow from d) - 1` is exercised in plan 2, where a date is first mapped to a weekday; this plan only enforces the column's domain.

**The mutation probes are the point.** Tasks 2, 7, 9, 10, 11, 12 and 13 each end with a step that removes a safeguard and requires **named** tests to go red. The review of the previous revision measured five safeguards that could be deleted with the suite staying green — including the two the plan was proudest of — and these probes are what stops that recurring. A probe whose outcome is "record what happens" is not a probe; every one here has a definite expected result.

**Type consistency.** `start_cell` / `cell_count` / `cell_index` / `start_boundary` / `end_boundary` / `from_boundary` / `to_boundary` are spelled identically in every migration and test; `app.is_active_operator()` appears identically in all thirteen policies and is audited by Task 3; the four write-function signatures match their declarations, grants and call sites.

**Known naming divergence, deliberate:** the table is `appointment_slot` while its payload column is `cell_index`. Renaming would cost a migration and buy nothing; recorded so the next reader knows it was a decision.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-17-salon-scheduler-foundations.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
