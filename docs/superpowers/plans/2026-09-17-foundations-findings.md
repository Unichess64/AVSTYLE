# Foundations — findings: where the specification and the migrations diverged

**Date:** 2026-09-17
**Plan:** `docs/superpowers/plans/2026-09-17-salon-scheduler-foundations.md`
**Spec:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md` — corrected
to revision 5 by this reconciliation
**Suite at the time of writing:** 143 tests in `tests/schema/`, all passing
**Migrations:** twelve — `0001`…`0005`, `00051_privilege_baseline`, `0006`…`0011`

This is the audit trail spec §15 asks for: it lets the next reader tell a
**deliberate correction** from a **drift**. Each section gives what the
specification said, what the migration does, and **which test decided it**.
Nothing here was found by reading. The site-by-site census that guided the spec
edit is `.superpowers/sdd/2026-09-17-salon-scheduler-foundations/task-15-census.md`;
the ruling-by-ruling ledger is
`.superpowers/sdd/2026-09-17-salon-scheduler-foundations/progress.md`.

Twenty divergences, ordered by how much damage each one was doing.

---

## 1. The privilege baseline: `TRUNCATE` is not gated by row-level security

**The spec said** (§6.4 measure 2, revision 3 and 4): `REVOKE INSERT, UPDATE,
DELETE ON appointment_slot FROM authenticated, anon`. Three verbs, one table.

**What the migrations do.** `0005_occupancy.sql` revokes `insert, update, delete,
truncate, references, trigger` on `appointment_slot`, leaving `SELECT` alone;
`00051_privilege_baseline.sql` then applies a **schema-wide baseline** —
truncate/references/trigger revoked from both roles on every application table,
insert/update/delete revoked from `anon` — and `0006_availability.sql` repeats it
for its own four tables. A standing catalogue audit enumerates
`information_schema.role_table_grants` rather than a hardcoded list.

**Why, measured twice.** Supabase's default ACL grants `anon` and `authenticated`
the full `rDxtm` set on every new table in `public`, and **RLS does not apply to
`TRUNCATE`** — it gates only SELECT/INSERT/UPDATE/DELETE.

- Stage one: as `authenticated` with a real operator's claims, `truncate
  appointment_slot` and then a colliding appointment insert **both committed** —
  two appointments for one operator on one date over cells 120–137, with the
  occupancy table holding only the newer one, so no availability query, narrowing
  check or conflict pre-check could see the clash. That is revision 1's rejected
  failure mode, reached through a door nobody had looked at, and it left the
  guarantee resting on PostgREST having no TRUNCATE verb — a convention, not a
  guarantee.
- Stage two: the identical hole was open on every other table. As `anon`,
  **`truncate table client` succeeded** — the only personal data in the system —
  and so did `truncate table appointment`, the same double-booking vector one
  join away.

**Which test decided it:** `tests/schema/catalogue-audit.test.ts` — *"grants
authenticated and anon nothing but SELECT on appointment_slot"* and *"grants no
table truncate, references or trigger to anon/authenticated, and no
insert/update/delete to anon"*. Supported by `occupancy.test.ts` → *"lets the
application READ the cells"* (which is what forbids `REVOKE ALL`) and *"refuses a
direct insert on appointment_slot"*. The re-reviewer measured, after the fix,
that `anon` holds SELECT only on all nine tables then existing, that its truncate
and insert are both `42501`, that its select still returns zero rows, that the
`authenticated` write path still works end to end, and that the audit catches
both a brand-new undefended table and a stray `grant truncate on client`.

**Two standing obligations, now normative in §6.4:**
1. **Every migration that creates a table must revoke in its own file.** `00051`
   is a fixed list and cannot reach a table that does not yet exist; a new table
   arrives with the full default ACL, `anon` TRUNCATE included. Honoured in
   `0006`.
2. **The audit is a check on those revokes, not a substitute for them** — it
   enumerates the catalogue so an omission fails at test time.

---

## 2. `00051`, because the CLI silently skips a non-digit prefix

**The spec said** nothing about migration filenames. The plan's File Structure
table lists `0001`–`0011` and does not list `00051`.

**What happened.** The stage-two fix above was first written as
`0005b_privilege_baseline.sql`, because `0006` was already claimed. The Supabase
CLI (2.117.0) **silently skips a migration whose numeric prefix contains a
non-digit**: it prints one easy-to-miss "Skipping migration" line, `db reset`
still exits 0, and the security fix would have shipped **completely inert while
reporting success**. The file is `00051_privilege_baseline.sql`, digits-only,
verified to sort strictly between `0005` and `0006` both as a string and in the
CLI's own applied order.

**Which test decided it:** none — no test can catch this, which is exactly why it
is recorded. It was caught by inspecting
`supabase_migrations.schema_migrations` after a reset and finding the file absent.
The applied set was re-measured for this note:
`0001, 0002, 0003, 0004, 0005, 00051, 0006, 0007, 0008, 0009, 0010, 0011`.

**Note for the next reader:** the plan's File Structure table still omits `00051`.
The reconciliation task was constrained to documents and to one plan edit, so this
is recorded rather than fixed.

---

## 3. `last_activity_at` could be written seventeen months backwards

**The spec said** (§6.2.2): "A trigger on insert, update and delete of both
`appointment` and `visit` sets it to the greatest `visit.visit_date`". No trigger
kind, no lock.

**What the migration does.** `0007_client_activity.sql` installs **constraint
triggers, `DEFERRABLE INITIALLY DEFERRED`**, on both tables, and the function
takes a row lock — `perform 1 from public.client where id = any(affected) … for
update` — **before** the recompute.

**Why the lock, measured.** `update client set last_activity_at = (select max(…))`
recomputes from a subquery under READ COMMITTED. When the UPDATE blocks on the
client row and then unblocks, EvalPlanQual re-projects it with the statement's
**original snapshot**, which cannot see the other transaction's just-committed
appointment. Two ordinary connections, one booking 2027-06-01 and one booking
2026-01-05 for the same client, left `last_activity_at = 2026-01-05` —
**seventeen months backwards**. §11.4's retention sweep would then delete the
personal data of a client with a booking next year: the exact failure the column
exists to prevent. Reproduced in both directions by the re-reviewer (2026-01-05
with the lock stripped, 2027-06-01 with it).

**Why constraint triggers, measured.** A plain `AFTER ROW` trigger runs its
`update client` synchronously inside each insert. Both appointments of one visit
share one `client` row, so the second insert blocks on the lock the first,
still-open transaction holds — and because `occupancy.test.ts`'s
overlapping-insert case never commits the first until the second resolves, that
is an **unconditional hang**, not a slow test. Converting both to deferred
constraint triggers made it resolve immediately. The brief that prescribed plain
triggers was internally inconsistent: its own step said "run the whole suite,
expect PASS", which its SQL could not do.

**Which test decided it:** `client-activity.test.ts` → *"counts a future visit, so
a client who has just rebooked is not swept"* and *"follows the visit when the
visit date changes"*; and for the trigger kind, `occupancy.test.ts` → *"rejects a
concurrent booking of the same cells at commit time"*, the test the plain-trigger
shape hung.

**Accepted consequence:** with the lock, two concurrent same-client bookings can
deadlock. See §5 below.

---

## 4. The lockout guard must check that the account still exists

**The spec said** (§6.1): the guard refuses any write that would leave "zero rows
with `is_active` and a non-null `auth_user_id`".

**What the migration does.** `0009_operator_guard.sql` counts only operators for
which `exists (select 1 from auth.users u where u.id = o.auth_user_id)`, on top of
`is_active` and non-null.

**Why.** `auth_user_id is not null` stays true after the account it names is
deleted, or if it was never real. Signed in as Vera, the only active operator,
`update operator set auth_user_id = '<uuid of no real account>'` was **allowed**:
the row still counts as "linked" and matches nobody, and the salon is locked out
of its own database. It is reachable from the Settings *link to an account*
screen — the very screen D30 relies on as the escape route — so it is exactly the
lockout this guard exists to prevent. `app.is_active_operator()` would correctly
refuse such an operator access, but the guard's **count** must agree with that or
it approves a lockout it cannot detect.

**Location, stated precisely because it is easy to misattribute.** The
`auth.users` check lives in `app.guard_operator_lockout()`, **not** in
`app.is_active_operator()`, whose body still reads `auth_user_id = auth.uid() and
is_active` alone (`0001_access_control.sql`). The predicate does not need the
check: a non-existent account cannot mint a JWT. Task 15's brief attributed the
requirement to the predicate; the ledger's Task 11 entry is the accurate one, and
the spec now names the guard.

**Which test decided it:** `operator-guard.test.ts` → *"refuses to relink the last
linked active operator to a non-existent account"* (`23514`).

---

## 5. `40P01` is an accepted outcome, and the application must retry

**The spec said** nothing about deadlocks, and revision 4 claimed in two migration
comments that a fixed lock order prevents them.

**What is true, measured in three shapes.**

| Shape | Trials | Result |
|---|---|---|
| Two operators deactivating each other | 20/20 and 30/30 | `40P01`, at the same rate with `order by id` as with `where true` |
| Two concurrent bookings for one client | 25/25 | genuine `40P01` with a real wait-for cycle, never a hang; exactly one side aborted; survivor's value correct every time |
| Two concurrent `swap_appointment_operators` spanning the same two clients | 25/60 | `40P01` |

**`ORDER BY id` does not prevent it, and no lock order can.** Each transaction's
own initiating `update … where id = $1` already locks its target row, by the
**caller's** choice, before any trigger runs — so with each side holding the row
the other needs, the cycle exists before the ordered lock is attempted. The
`ORDER BY` in these guards is consistency, not protection.

**Why this is the right trade.** Without the locks the alternatives are: both
sides of a mutual deactivation committing and leaving the salon locked out, or a
`last_activity_at` written seventeen months backwards so the retention sweep
deletes a client who has a booking next year. A loud, retryable abort beats a
silent wrong write. Nothing ends up corrupted; one transaction is told to try
again.

**Consequence, now normative in spec §10.5:** every write path that touches
`operator`, or that books, moves or deletes an appointment, **retries on
`40P01`**. A raw `40P01` reaching an operator is a defect in the application
layer, not in the schema.

**Which test decided it:** `operator-guard.test.ts` → *"never lets two operators
deactivating each other BOTH commit"*, rewritten to assert the real property (at
least one side fails, at least one linked active operator remains): 10/10 red with
the lock removed, 10/10 green with it. It deliberately does **not** assert
`40P01`, because a test that awaits the first statement before sending the second
cannot fail on that assertion — which is what the earlier "discriminating"
version did.

---

## 6. `order by 1` orders by a constant — DEFERRED DEFECT, not fixed

**What the code says.** `supabase/migrations/0007_client_activity.sql:43`:

```sql
perform 1 from public.client where id = any(affected) order by 1 for update;
```

`order by 1` orders by the **constant `1`**, not by `id`, and delivers no ordering
at all: `EXPLAIN VERBOSE` shows a plan byte-identical to having no `ORDER BY`.

**Three sites, to be fixed together:**

| File | Line | What it is |
|---|---|---|
| `supabase/migrations/0007_client_activity.sql` | 43 | the code — should read `order by id` |
| `supabase/migrations/0007_client_activity.sql` | 29 | a comment claiming "a deterministic order (order by 1 …)" |
| `supabase/migrations/0008_orphan_visit.sql` | 76 | a comment citing "touch_client_activity's own `order by 1` discipline for `client`" |

The two sibling guards are correct and are the model:
`0009_operator_guard.sql:38` and `0010_write_functions.sql:79` both use
`order by id`.

**Disposition and why.** Recorded, **not fixed**. Task 15's constraints forbid
touching any migration, test or workflow, and the brief's own alternative — "or
record it as a deferred defect with its sites" — is the branch that constraint
selects. Measured as **not** changing today's deadlock rate (11/12 trials
deadlock either way; the cause is structural, most likely the foreign-key check
taking its own lock on the referenced `client` row before the trigger runs). So
what is live today is not a wrong lock order but **two comments asserting a
guarantee the code does not provide** — which is the same class of defect as a
test that cannot fail, and is why it is written down rather than left to memory.

**Carried into:** spec §6.2.2 (in place) and §12.1 (as a deferred defect with its
sites).

---

## 7. `move_visit` and `swap_appointment_operators`: `P0002`, and a leading re-defer

**The spec said** (§4.6): only that the function issues `SET CONSTRAINTS …
IMMEDIATE` before committing.

**What the migration does.** `0010_write_functions.sql`:

- Each function **begins** with `set constraints appointment_slot_unique
  deferred`. The trailing `SET CONSTRAINTS ALL IMMEDIATE` persists for the **rest
  of the transaction**, not just that call, so a second, otherwise non-colliding
  `move_visit` in the same explicit transaction had its two updates checked row by
  row and raised a **false** collision purely from call ordering. Removing the
  line reproduces it live.
- Each raises **`P0002`** when the target does not exist or row-level security
  hides it from the caller — an outsider, or an operator deactivated while the
  sheet was open. Revision 4 returned `void` either way, which made a silent
  no-op indistinguishable from a completed move and would have made §10.2's
  "this was deleted while you had it open" unimplementable.
- Both are `security invoker`, so they run **under** the caller's row-level
  security rather than above it.

**Also measured:** a no-change move on a *visible* visit does **not** wrongly
raise `P0002` (`FOUND` is true even when the UPDATE changes nothing); a swap with
one non-existent id raises before either UPDATE, so there is no half-swap; and
`p_a = p_b` is left as a harmless no-op by deliberate choice.

**Which test decided it:** `write-functions.test.ts` → *"allows two non-colliding
move_visit calls in the same explicit transaction"*, *"raises P0002 for a visit
that does not exist"*, *"raises P0002, not a silent success, when the caller
cannot see the visit"*, *"raises P0002 when an appointment does not exist"*,
*"raises P0002, not a silent success, when the caller cannot see an appointment"*,
and *"reports a collision inside the transaction, not at commit"* (both functions).

---

## 8. EXECUTE on the write functions, and a privilege test that could not fail

**The spec said** nothing about function privileges.

**What the migration does.** `0010` revokes EXECUTE on all four functions from
`public` and `anon`, and grants it to `authenticated` only. Supabase grants
EXECUTE on a new `public` function to `anon` by default, and
`swap_appointment_operators` takes row locks **before** row-level security
filters anything — so an unauthenticated caller could otherwise hold locks on
`appointment` rows.

**The defect in the first test of it.** "Call as `anon`, expect `42501`" cannot
tell "EXECUTE revoked" from "EXECUTE granted, but the body then hit a revoked
table privilege or an RLS policy" — both raise `42501`. Measured: granting
EXECUTE back to `anon` on all four left `move_visit` and
`swap_appointment_operators` still raising `42501` (from the table grants `00051`
revokes) and `write_exception_day` still raising `42501` (from its RLS policy).
**Three of the four behavioural tests stayed green with EXECUTE wrongly
granted** — unable to fail.

**Which test decided it:** `write-functions.test.ts` → *"anon lacks EXECUTE on
%s"* and *"authenticated has EXECUTE on %s"*, over all four exact signatures,
using `has_function_privilege`, which also catches a stray grant to `PUBLIC`.

---

## 9. `app` schema usage and the helper's EXECUTE are granted to `anon` too

**The spec said** (§4.3): `grant usage on schema app to authenticated;`

**What the migration does.** `0001_access_control.sql` grants usage `to
authenticated, anon`, and `grant execute on function app.is_active_operator() to
authenticated, anon`. `anon` deliberately keeps `SELECT` on the tables.

**Why.** An unauthenticated visitor must see **zero rows** — row-level security
filtering — not a permission error. Without usage on `app`, the policy call raises
*permission denied for schema app* and the anonymous request becomes an error,
which is the failure mode §4.3 already condemns one paragraph later for
`authenticated`. Revoking `SELECT` from `anon` would turn the same "0 rows" into
`42501` while changing nothing about what `anon` can actually read.

**Which test decided it:** `access-control.test.ts` → *"shows nothing to an
unauthenticated visitor"*; `client.test.ts` → *"hides client data from an
unauthenticated visitor"*.

**Related, measured in Task 2:** replacing the predicate with `auth.uid() is not
null` — revision 1's hole — makes *"shows nothing to an authenticated account that
is not an operator"* fail. The test that exists for that hole does catch it, and
both conjuncts of the predicate were separately proved load-bearing by mutation.

---

## 10. "Every table, every verb" has one carve-out

**The spec said** (§4.3): "the predicate is identical for every table, every verb
and every row."

**What the migrations do.** Twelve tables carry a `for all` policy.
`appointment_slot` carries a **`for select` policy only** — measured,
`polcmd = 'r'` in `pg_policy` — because measure 2 revokes every write privilege
on it from both roles, and a write policy would describe a verb nobody holds.

**Which test decided it:** `catalogue-audit.test.ts` → *"has at least one policy
on every table in public"* and *"routes every policy through
app.is_active_operator()"*. That second audit had a defect of its own: it read
only `polqual`, so a WITH CHECK-only policy — **the only shape Postgres allows
for an INSERT policy** — passed it silently, because `NULL not like '%…%'` is NULL
and the row dropped out of the result. It now reads `polqual` **and**
`polwithcheck` with NULLs coalesced.

---

## 11. The empty `search_path` pin is stored as `search_path=""`

**The spec said** (§4.3): `set search_path = ''` is mandatory. Nothing about how
it reads back.

**What is true.** Postgres unparses the empty pin as **`search_path=""`** — a
quoted empty identifier — not as a bare `search_path=`. The plan's suggested
literal was wrong; the implementer measured it and the re-reviewer confirmed
against the live catalogue. Re-measured for this note: every `security definer`
function in `public` and `app` has `proconfig = {search_path=""}`.

**Why it matters.** An audit that matches `search_path=` as a prefix passes `set
search_path = 'public'` just as happily — and the audit's own stated rule is that
the path must be **empty**. That is a guard that cannot fail in the case it
exists for, in the task whose entire purpose is standing guards. It now unnests
`proconfig` and compares the value half exactly, after unquoting.

**Which test decided it:** `catalogue-audit.test.ts` → *"pins search_path on every
security definer function"*.

---

## 12. `app.touch_updated_at()` is the one `security invoker` trigger function

**The spec said** nothing; the plan's Global Constraints say `security definer`
functions always carry `set search_path = ''`.

**What the migration does.** `0004_visit_appointment.sql` declares
`app.touch_updated_at()` as `security invoker` with **no** `search_path` pin
(measured: `proconfig` is null — the only such function here). It assigns to
`NEW` and references nothing schema-qualified, so the pin would buy nothing, and
elevating it would be gratuitous in a schema whose constraints make a point of
definer discipline.

**Which test decided it:** *"pins search_path on every security definer
function"* — which passes **because** this function is invoker: the audit filters
on `prosecdef`. Recorded so a future reader neither "fixes" it nor reads the
Global Constraint as violated.

---

## 13. `updated_at` uses `clock_timestamp()`, and `visit` carries one

**The spec said** (§6.3): `visit` had no `updated_at` at all, and
`appointment.updated_at` named no default — while §10.2 required `visit` to carry
one. The document asserted in one section a column it withheld in another.

**What the migration does.** Both tables carry `updated_at timestamptz not null
default clock_timestamp()`, refreshed by a `before update` trigger.

**Why not `now()`.** `now()` is fixed for the transaction, so two updates inside
one transaction compare equal and §10.2's compare-and-set would not see the
second.

**Which test decided it:** `visit-appointment.test.ts` → *"bumps updated_at when
an appointment changes"* and *"bumps updated_at when the visit changes"*. Worth
recording what it took to make those able to fail, because two successive
attempts could not:

1. The original pair was labelled discriminating but each `asOwner` call opens its
   own connection, so insert and update land in different transactions and
   `now()` would differ between them anyway — a regression to `now()` would ship
   silently past both.
2. The prescribed fix (one before-read, one update, one after-read in a single
   connection) does **not** discriminate either, because the "before" value was
   written by the earlier insert's separate transaction, so `after > before`
   holds under `now()` as well. That correction was to a ruling of the
   controller's own.
3. The shape that works is **two updates inside one explicit transaction with
   `pg_sleep(0.01)` between them**. Without the sleep it is ~50% flaky even with
   correct code, because `clock_timestamp()` has microsecond resolution while a
   JavaScript `Date` truncates to the millisecond. Independently reproduced:
   20/20 bare reads in one transaction landed on the same millisecond, and
   `now()` was identical twice across a 10 ms sleep while `clock_timestamp()`
   advanced ~12 ms.

---

## 14. `salon_closure.reason` is `not null`

**The spec said** (§6.5): `reason`, listed among columns whose nullability is not
stated, next to two that are explicitly "both nullable".

**What the migration does.** `0006_availability.sql`: `reason text not null`
(measured, `is_nullable = NO`).

**Why.** §9.1 renders the reason unconditionally on a closure day; a null would
draw a dimmed column with no explanation, which is precisely the failure `reason`
exists to prevent. It describes the salon, not a client, so D26 does not reach
it.

**Which test decided it:** `availability.test.ts` → *"stores a whole-day closure
spanning a fortnight"* and *"stores a partial closure across several dates"* —
both of which must supply a `reason` to insert at all.

---

## 15. `write_exception_day` and `write_exception_days` now have names

**The spec said** (§6.5, §9.8): the behaviour — one transaction for a day and its
ranges, bulk writing over a date range — with no function named.

**What the migration does.** `0010_write_functions.sql` defines
`public.write_exception_day(p_operator_id uuid, p_date date, p_ranges int[][])`,
which **deletes any existing exception for that operator and date first** (so a
re-write replaces rather than accumulates), treats `p_ranges` **null or empty** as
away, and returns the `exception_day` id; and
`public.write_exception_days(p_operator_id, p_from, p_to, p_ranges)`, which loops
the first over the range in one transaction and returns the count.

**Which test decided it:** `write-functions.test.ts` → *"writes the day and its
ranges together"*, *"replaces the previous exception for the same date"*, *"leaves
nothing behind when a range is invalid"* (a day-7 failure writes none of days
1–6, matching §6.5's intent) and *"writes a fortnight of absence in one call"*.

**Deferred minor, recorded:** `write_exception_day` silently drops a third column
of a malformed range; `write_exception_days` returns 0 for a reversed or null
range; the fortnight test checks only the count, not the rows.

---

## 16. `immutable_unaccent` is defined against schema `extensions`

**The spec said** (§8.2): "an immutable wrapper around `unaccent`".

**What the migration does.** `0003_client.sql` defines
`public.immutable_unaccent(text)` as `immutable strict parallel safe` with `set
search_path = ''` and the body `select
extensions.unaccent('extensions.unaccent'::regdictionary, $1)`.

**Why the qualification.** Supabase installs extensions into schema `extensions`
(measured: both `unaccent` and `btree_gist` are there — `0001` creates
`btree_gist` `with schema extensions` for the same reason, and an unqualified `if
not exists` would silently no-op if a future base image pre-installed one
elsewhere, after which this function fails at creation and takes every later
migration with it). Under an empty `search_path` nothing unqualified resolves at
all. Naming the dictionary explicitly is what makes the wrapper honestly
`immutable`, and therefore indexable. Verified `provolatile = 'i'` with
`proconfig {search_path=""}`.

**Which test decided it:** `client.test.ts` → *"finds a client whose name differs
by accent and case"*.

---

## 17. `list_auth_accounts()` now has a name and a stated contract

**The spec said** (§9.9): a `security definer` function owned by the migration
role returning only id and email, callable only by an active operator.

**What the migration does.** `0011_account_directory.sql` defines
`public.list_auth_accounts()` returning exactly `(id uuid, email text)`,
`security definer` with `set search_path = ''`, EXECUTE revoked from `public` and
`anon` and granted to `authenticated`. It returns early — empty — unless
`app.is_active_operator()`.

**Which test decided it:** the eight tests of `account-directory.test.ts`. With
the guard removed, an outsider and a deactivated operator see all four seeded
accounts. The return type is asserted as an **exact set** of columns; `anon` is
denied at the function boundary with `42501` **and** `has_function_privilege` is
false, so a stray grant to `PUBLIC` would be caught; there is no dynamic SQL and
no argument, so no injection surface; and every id it can return satisfies §6.1's
`auth.users` existence guard by construction.

**Corrected here:** the Task 13 report attributed the RLS bypass to a superuser
owner. Measured, `postgres` has `rolsuper = false` and `rolbypassrls = true`.

---

## 18. §4.3's "superuser owner" is false

**The spec said** (§4.3, revision 4): "with the superuser owner Supabase actually
uses, `force row level security` is inert".

**What is true.** Measured against the live catalogue: `postgres` has **`rolsuper
= false` and `rolbypassrls = true`**. The conclusion stands — an owner that
bypasses row-level security makes `force row level security` inert — but the
mechanism is `rolbypassrls`, not superuser status, and a reader who goes looking
for a superuser will not find one. The same slip appears in Task 13's report.

Also confirmed: `42P17` comes only from a policy whose expression names its own
table directly, which is the shape the helper function exists to avoid, and the
recursion goes away because the function's **owner** also owns `public.operator`
— not because of `security definer` by itself.

**Which test decided it:** `catalogue-audit.test.ts` → *"does not force row-level
security on operator"*, plus the `pg_roles` measurement above.

---

## 19. The table count: measured, and the spec was already right

**The spec said** (§6): "Thirteen tables."

**What the catalogue says:**

```sql
select count(*) from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
```

→ **13**: appointment, appointment_slot, client, exception_day, exception_range,
operator, operator_service, salon_closure, salon_settings, service,
service_category, visit, weekly_availability.

**No change.** Recorded for two reasons. First, so the next reader knows the word
was *counted* rather than assumed. Second, because an earlier version of this
step counted bold-backtick line starts with `grep`, which also matches prose in
§7 and would have reported a mismatch that does not exist — sending the engineer
to "fix" a correct section. The count comes from the catalogue.

---

## 20. `TRUNCATE` freezes `last_activity_at` — a new declared limit

**The spec said** nothing; §12 had ten limits.

**What is true.** `truncate table appointment` (or `visit`) fires **no row
trigger at all**, and a constraint trigger cannot even be declared `FOR EACH
STATEMENT … ON TRUNCATE` — constraint triggers are `FOR EACH ROW` only — so the
divergence to constraint triggers in §3 above **forecloses the usual
statement-trigger remedy**. A client whose visit and appointment rows are removed
that way keeps her last-computed `last_activity_at` frozen instead of reverting
to null, so §11.4's sweep never picks her up.

**Severity: over-retention, not data loss**, and not reachable by the
application — `00051` revokes TRUNCATE on both tables from `anon` and
`authenticated`, so only the database owner can get there.

**Which test decided it:** none directly; it is the reasoned consequence of §3's
measured divergence, and the privilege half is audited by *"grants no table
truncate, references or trigger to anon/authenticated…"*. Now spec §12 item 11.

---

## Also corrected: the plan's Task 14 Step 1

**The plan said:** `npx supabase stop` / `npx supabase start` / `npm test`, with
the note that `db reset` is only needed after editing a migration.

**Measured:** `npx supabase stop` **keeps a backup volume by default**
(`"backup":true`), so `start` restores the previous, test-mutated database
instead of rebuilding from migrations and seed — **silently defeating the
cold-start gate this step exists to be**. The implementer used `stop
--no-backup`; the correction applied to the plan is `npx supabase db reset && npm
test`, which has no volume semantics to get wrong.

---

## Deferred minors carried forward from the ledger

Not divergences from the spec, but open items the next reader should have in one
place. Each is recorded in
`.superpowers/sdd/2026-09-17-salon-scheduler-foundations/progress.md` against its
task.

| Item | Source |
|---|---|
| `order by 1` should be `order by id` in three places | §6 above; spec §12.1 |
| The sync trigger's DELETE branch is unmeasurable — the FK cascade always gets there first | Task 7; spec §12.1 |
| With the constraint made immediate, the concurrency test fails as a 20-second timeout rather than a readable error; a `lock_timeout` would say what it is | Task 7 |
| `relname = 'operator'` in the FORCE audit is not schema-qualified | Task 3 |
| The `check (id)` branch of `salon_settings`' single-row mechanism is never exercised; only the uniqueness collision is | Task 4 |
| `service.category_id`'s implicit NO ACTION delete behaviour is correct but uncommented | Task 4 |
| No negative test on write verbs by `anon` or an outsider; the policy is `for all` but only `select` is exercised | Task 2 |
| Relinking the last active operator to **another existing** account passes the guard — a per-operator lockout, not a salon one | Task 11 |
| `operator-guard.test.ts` leaves two operators inactive after the file runs; every dependent file calls `resetData()` in `beforeEach`, so nothing breaks today | Task 11 |
| *"survives a client deletion cascading through both"* would pass with the orphan guard removed; its real subject is termination of the cascade | Task 10 |
| *"leaves the other client untouched"* does not measure the scoping it is named for | Task 9; spec §13.2 |
| `write_exception_day(s)` input-validation gaps | §15 above |
| CI pins Node 22, this machine runs v24.18.1, and nothing pins or catches the mismatch | Task 14 |
| The plan's File Structure table omits `00051_privilege_baseline.sql` | §2 above |
| Unverifiable without a GitHub remote: whether a real runner's `supabase start` seeds identically, image pull within runner limits, cache behaviour, CI's UTC clock against the date parser | Task 14 |
