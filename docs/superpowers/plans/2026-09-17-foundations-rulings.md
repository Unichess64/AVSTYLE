# Foundations — decision log

Every ruling taken on the user's behalf while executing
`docs/superpowers/plans/2026-09-17-salon-scheduler-foundations.md`, in the order taken,
with what it costs if wrong. Extracted verbatim from the execution ledger, which was
scratch and is gone; this file is the durable copy.

## Ruling: seedFixture() is split by layer, and each task uses the deepest fixture
## Ruling: seedFixture() is split by layer, and each task uses the deepest fixture
its tables support — `seedCatalogue()` from T4, `seedClients()` from T5, and
its tables support — `seedCatalogue()` from T4, `seedClients()` from T5, and
`seedFixture()` (both) from T6 onward.
`seedFixture()` (both) from T6 onward.
Why: the plan introduces one fixture in T2 that depends on tables T4 and T5
Why: the plan introduces one fixture in T2 that depends on tables T4 and T5
create, so T2 and T4 would fail on a missing relation rather than on the
create, so T2 and T4 would fail on a missing relation rather than on the
safeguard under test.
safeguard under test.
Cost if wrong: one extra helper function and three import lines; no schema
Cost if wrong: one extra helper function and three import lines; no schema
change, no test semantics change.
change, no test semantics change.


## Ruling: `resetData()` truncates only the application tables that currently
## Ruling: `resetData()` truncates only the application tables that currently
exist, enumerated from pg_class rather than listed literally.
exist, enumerated from pg_class rather than listed literally.
Why: it is called from T2 onward while the schema is still being built, and a
Why: it is called from T2 onward while the schema is still being built, and a
literal list raises 42P01 on every task before T8.
literal list raises 42P01 on every task before T8.
Cost if wrong: a table added later and not truncated leaks state between tests;
Cost if wrong: a table added later and not truncated leaks state between tests;
the enumeration makes that impossible, which is also why it is preferable to
the enumeration makes that impossible, which is also why it is preferable to
the literal list the plan wrote.
the literal list the plan wrote.


## Ruling: the two client-scoped access assertions in T2's access-control test
## Ruling: the two client-scoped access assertions in T2's access-control test
("hides client data from an outsider", "…from an unauthenticated visitor")
("hides client data from an outsider", "…from an unauthenticated visitor")
move to T5's client test.
move to T5's client test.
Why: they assert on a table T5 creates. The intent — that the predicate guards
Why: they assert on a table T5 creates. The intent — that the predicate guards
every table and not only `operator` — is preserved, and T3's catalogue audit
every table and not only `operator` — is preserved, and T3's catalogue audit
enforces it structurally from T3 onward.
enforces it structurally from T3 onward.
Cost if wrong: the two assertions land one task later than the plan intended;
Cost if wrong: the two assertions land one task later than the plan intended;
the audit covers the interval.
the audit covers the interval.


## Ruling: finding 1 (the config.toml assertion cannot fail) stands against the
## Ruling: finding 1 (the config.toml assertion cannot fail) stands against the
plan text, and the plan is wrong. The regex is verbatim from the plan's Task 2,
plan text, and the plan is wrong. The regex is verbatim from the plan's Task 2,
but `config.toml` carries three `enable_signup` keys and the unanchored regex
but `config.toml` carries three `enable_signup` keys and the unanchored regex
matches `[auth.sms]` at line 258 — the reviewer measured that setting line 175
matches `[auth.sms]` at line 258 — the reviewer measured that setting line 175
back to `true` leaves the test green. A presidio that cannot fail is the exact
back to `true` leaves the test green. A presidio that cannot fail is the exact
defect this plan exists to prevent, and the README cites this test as what
defect this plan exists to prevent, and the README cites this test as what
makes its claim true. The finding wins; the regex is anchored to the [auth]
makes its claim true. The finding wins; the regex is anchored to the [auth]
block and the mutation is re-run against line 175.
block and the mutation is re-run against line 175.
Cost if wrong: a slightly more brittle regex if Supabase reorders config.toml.
Cost if wrong: a slightly more brittle regex if Supabase reorders config.toml.


## Ruling: finding 3 (each conjunct of the access predicate is unmeasured) is
## Ruling: finding 3 (each conjunct of the access predicate is unmeasured) is
labelled Minor by the reviewer but enters the fix round anyway.
labelled Minor by the reviewer but enters the fix round anyway.
Why: it is two `db reset` cycles against the system's entire security boundary,
Why: it is two `db reset` cycles against the system's entire security boundary,
and the plan's whole premise is that safeguards are measured rather than
and the plan's whole premise is that safeguards are measured rather than
declared. Deferring it would defer exactly the measurement this task exists for.
declared. Deferring it would defer exactly the measurement this task exists for.
Cost if wrong: a few minutes of wall clock.
Cost if wrong: a few minutes of wall clock.


## Ruling: the Critical (the policy-routing audit reads only `polqual`, so a
## Ruling: the Critical (the policy-routing audit reads only `polqual`, so a
WITH CHECK-only policy — the only shape Postgres allows for an INSERT policy —
WITH CHECK-only policy — the only shape Postgres allows for an INSERT policy —
passes it silently, because `NULL not like '%…%'` is NULL and the row drops out
passes it silently, because `NULL not like '%…%'` is NULL and the row drops out
of the result) stands against the plan text, and the plan is wrong. Same for the
of the result) stands against the plan text, and the plan is wrong. Same for the
first Important: the audit matches `search_path=` as a prefix, so
first Important: the audit matches `search_path=` as a prefix, so
`set search_path = 'public'` passes an audit whose stated rule is that it must be
`set search_path = 'public'` passes an audit whose stated rule is that it must be
EMPTY. Both are presidi that cannot fail in the case they exist for, in the task
EMPTY. Both are presidi that cannot fail in the case they exist for, in the task
whose entire purpose is standing guards. The findings win.
whose entire purpose is standing guards. The findings win.
Cost if wrong: two slightly more intricate catalogue queries.
Cost if wrong: two slightly more intricate catalogue queries.


## Ruling: the second Important — that "all five audits pass" is not evidence an
## Ruling: the second Important — that "all five audits pass" is not evidence an
audit can fail — is accepted and becomes a fix requirement. Each of the five
audit can fail — is accepted and becomes a fix requirement. Each of the five
must be shown going red against a deliberately violating object.
must be shown going red against a deliberately violating object.
Why: it is the same principle the plan applies to schema safeguards, applied to
Why: it is the same principle the plan applies to schema safeguards, applied to
the audits themselves, and this review is what exposed that I had not applied it.
the audits themselves, and this review is what exposed that I had not applied it.
Cost if wrong: one extra cycle of probe objects created and dropped.
Cost if wrong: one extra cycle of probe objects created and dropped.


## Ruling: the Important stands against the plan text, and the plan is wrong. The
## Ruling: the Important stands against the plan text, and the plan is wrong. The
two `updated_at` tests are labelled "⚠ discriminating" but each `asOwner` call
two `updated_at` tests are labelled "⚠ discriminating" but each `asOwner` call
opens its own connection, so insert and update land in different transactions
opens its own connection, so insert and update land in different transactions
and `now()` would differ between them anyway — measured at 6-12 ms apart. A
and `now()` would differ between them anyway — measured at 6-12 ms apart. A
regression from `clock_timestamp()` to `now()` would ship silently past both.
regression from `clock_timestamp()` to `now()` would ship silently past both.
The code is right; the net is not. Same class as the Task 3 Critical: a presidio
The code is right; the net is not. Same class as the Task 3 Critical: a presidio
that cannot fail in the case it exists for.
that cannot fail in the case it exists for.
Cost if wrong: two tests restructured into one connection each.
Cost if wrong: two tests restructured into one connection each.
Task 6: fix round 1/5 (1 addressed, 0 open — the two updated_at tests
Task 6: fix round 1/5 (1 addressed, 0 open — the two updated_at tests
restructured; commits 2088bef..36c65ff).
restructured; commits 2088bef..36c65ff).
Task 6: measured, and it corrects MY OWN ruling: the fix shape I prescribed —
Task 6: measured, and it corrects MY OWN ruling: the fix shape I prescribed —
one before-read, one update, one after-read in a single connection — does NOT
one before-read, one update, one after-read in a single connection — does NOT
discriminate either, because the "before" value was written by the earlier
discriminate either, because the "before" value was written by the earlier
insert's separate transaction, so `after > before` holds under `now()` as well.
insert's separate transaction, so `after > before` holds under `now()` as well.
The shape that works is TWO updates inside one explicit transaction with
The shape that works is TWO updates inside one explicit transaction with
`pg_sleep(0.01)` between them. Without the sleep it is ~50% flaky even with
`pg_sleep(0.01)` between them. Without the sleep it is ~50% flaky even with
correct code, because clock_timestamp() has microsecond resolution while a JS
correct code, because clock_timestamp() has microsecond resolution while a JS
Date truncates to the millisecond. Re-reviewer reproduced both facts
Date truncates to the millisecond. Re-reviewer reproduced both facts
independently: 20/20 bare reads in one transaction landed on the same
independently: 20/20 bare reads in one transaction landed on the same
millisecond, and `now()` was identical twice across a 10 ms sleep while
millisecond, and `now()` was identical twice across a 10 ms sleep while
clock_timestamp() advanced ~12 ms.
clock_timestamp() advanced ~12 ms.
Task 6: complete (commits 8a6df14..36c65ff, review clean).
Task 6: complete (commits 8a6df14..36c65ff, review clean).


## Ruling: the Critical is load-bearing and is fixed now, and a privilege audit is
## Ruling: the Critical is load-bearing and is fixed now, and a privilege audit is
added so the whole class cannot recur. `trigger` and `references` are revoked
added so the whole class cannot recur. `trigger` and `references` are revoked
with it. The specification's §6.4 measure 2 is wrong and Task 15 must carry this.
with it. The specification's §6.4 measure 2 is wrong and Task 15 must carry this.
Cost if wrong: none identified; the app never truncates.
Cost if wrong: none identified; the app never truncates.


## Ruling: Important 1 — the plan's own Step 5 probe is confounded. Disabling the
## Ruling: Important 1 — the plan's own Step 5 probe is confounded. Disabling the
whole trigger also kills the fixture's INSERT, so `appointment_slot` is empty and
whole trigger also kills the fixture's INSERT, so `appointment_slot` is empty and
all five realignment tests go red whether or not they discriminate. The reviewer
all five realignment tests go red whether or not they discriminate. The reviewer
ran the probe that DOES discriminate (neuter only the UPDATE branch) and the
ran the probe that DOES discriminate (neuter only the UPDATE branch) and the
conclusion holds — the five tests are sound — but the evidence the plan asked for
conclusion holds — the five tests are sound — but the evidence the plan asked for
does not support it. The probe is rewritten to mutate the UPDATE branch.
does not support it. The probe is rewritten to mutate the UPDATE branch.
Cost if wrong: one more mutation cycle.
Cost if wrong: one more mutation cycle.


## Ruling: this is load-bearing and is fixed now rather than parked, as fix round 2.
## Ruling: this is load-bearing and is fixed now rather than parked, as fix round 2.
Why: it is the same class as the Critical just closed, it is measured rather than
Why: it is the same class as the Critical just closed, it is measured rather than
deduced, and it reaches the client table. Parking it would mean every later task
deduced, and it reaches the client table. Parking it would mean every later task
builds on a schema whose stated guarantee is false everywhere but one table.
builds on a schema whose stated guarantee is false everywhere but one table.
The fix is a new migration `0005b_privilege_baseline.sql` — `0005b` because
The fix is a new migration `0005b_privilege_baseline.sql` — `0005b` because
`0006` is claimed by Task 8 for availability — plus widening the audit from one
`0006` is claimed by Task 8 for availability — plus widening the audit from one
table to the whole schema.
table to the whole schema.
Cost if wrong: one extra migration file and a broader audit; no behaviour the
Cost if wrong: one extra migration file and a broader audit; no behaviour the
application relies on is removed, because PostgREST never truncates and `anon`
application relies on is removed, because PostgREST never truncates and `anon`
never passes the access predicate anyway.
never passes the access predicate anyway.
Task 7: fix round 2/5 (1 addressed, 0 open — migration 00051_privilege_baseline
Task 7: fix round 2/5 (1 addressed, 0 open — migration 00051_privilege_baseline
and a schema-wide privilege audit; commits cd28082..f09abb6). Re-reviewer
and a schema-wide privilege audit; commits cd28082..f09abb6). Re-reviewer
measured every claim: anon now holds SELECT only on all nine tables, anon's
measured every claim: anon now holds SELECT only on all nine tables, anon's
truncate and insert are both 42501, anon's select still returns zero rows, the
truncate and insert are both 42501, anon's select still returns zero rows, the
authenticated write path still works end to end, and the audit catches both a
authenticated write path still works end to end, and the audit catches both a
brand-new undefended table and a stray `grant truncate on client`.
brand-new undefended table and a stray `grant truncate on client`.
Task 7: measured — the Supabase CLI (2.117.0) SILENTLY SKIPS a migration whose
Task 7: measured — the Supabase CLI (2.117.0) SILENTLY SKIPS a migration whose
numeric prefix contains a non-digit. `0005b_…` prints one easy-to-miss "Skipping
numeric prefix contains a non-digit. `0005b_…` prints one easy-to-miss "Skipping
migration" line, `db reset` still exits 0, and the fix would have shipped
migration" line, `db reset` still exits 0, and the fix would have shipped
completely inert. MY OWN RULING prescribed that filename. The file is
completely inert. MY OWN RULING prescribed that filename. The file is
`00051_privilege_baseline.sql`, verified to sort strictly between 0005 and 0006.
`00051_privilege_baseline.sql`, verified to sort strictly between 0005 and 0006.
Task 7: OBLIGATION ON EVERY LATER TASK THAT CREATES A TABLE: 00051 is a fixed
Task 7: OBLIGATION ON EVERY LATER TASK THAT CREATES A TABLE: 00051 is a fixed
list of per-table revokes and cannot cover tables that do not exist yet. Any new
list of per-table revokes and cannot cover tables that do not exist yet. Any new
table arrives with the full default ACL — anon TRUNCATE included — until its own
table arrives with the full default ACL — anon TRUNCATE included — until its own
migration revokes. The schema-wide audit catches it at test time, but the revoke
migration revokes. The schema-wide audit catches it at test time, but the revoke
belongs in the migration that creates the table. Carried into Task 8's dispatch.
belongs in the migration that creates the table. Carried into Task 8's dispatch.
Task 7: complete (commits 36c65ff..f09abb6, review clean, 2 fix rounds).
Task 7: complete (commits 36c65ff..f09abb6, review clean, 2 fix rounds).
Task 8: complete (commits f09abb6..4310c83, review clean — spec ✅, quality
Task 8: complete (commits f09abb6..4310c83, review clean — spec ✅, quality
approved, ZERO findings). The privilege obligation was honoured in the migration
approved, ZERO findings). The privilege obligation was honoured in the migration
rather than left to the audit, and the reviewer proved the audit would have
rather than left to the audit, and the reviewer proved the audit would have
caught an omission by simulating one. Touching vs overlapping ranges, the
caught an omission by simulating one. Touching vs overlapping ranges, the
exception_day_id-keyed exclusion constraint, the absence of any is_absent flag,
exception_day_id-keyed exclusion constraint, the absence of any is_absent flag,
and the multi-date partial closure were each verified against the live catalogue.
and the multi-date partial closure were each verified against the live catalogue.


## Ruling: fixed now, not parked. The fix is one statement before the UPDATE —
## Ruling: fixed now, not parked. The fix is one statement before the UPDATE —
`perform 1 from public.client where id = any(affected) order by 1 for update` —
`perform 1 from public.client where id = any(affected) order by 1 for update` —
which the reviewer measured as turning the same race CONSISTENT.
which the reviewer measured as turning the same race CONSISTENT.
Cost if wrong: one more row lock on a table with a few hundred rows.
Cost if wrong: one more row lock on a table with a few hundred rows.


## Ruling: the Important — Task 12's `set constraints all immediate` fires this
## Ruling: the Important — Task 12's `set constraints all immediate` fires this
trigger inside the write functions and holds the client row lock for the rest of
trigger inside the write functions and holds the client row lock for the rest of
the caller's transaction, re-arming the contention this divergence disarmed — is
the caller's transaction, re-arming the contention this divergence disarmed — is
carried into Task 12's dispatch as a stated hazard, and the `for update` fix
carried into Task 12's dispatch as a stated hazard, and the `for update` fix
removes its correctness half now.
removes its correctness half now.
Cost if wrong: a future two-connection test against move_visit for one client
Cost if wrong: a future two-connection test against move_visit for one client
would serialise rather than run.
would serialise rather than run.


## Ruling: the new consequence the implementer surfaced — with the `for update`,
## Ruling: the new consequence the implementer surfaced — with the `for update`,
two concurrent same-client bookings can now hit a genuine Postgres deadlock
two concurrent same-client bookings can now hit a genuine Postgres deadlock
(40P01) instead of silently racing — is ACCEPTED as the correct trade. A loud,
(40P01) instead of silently racing — is ACCEPTED as the correct trade. A loud,
retryable abort beats a silent seventeen-month backwards write that deletes a
retryable abort beats a silent seventeen-month backwards write that deletes a
client who has a booking next year. It becomes an application obligation: the
client who has a booking next year. It becomes an application obligation: the
write path must retry on 40P01. Recorded here, carried into Task 12's dispatch,
write path must retry on 40P01. Recorded here, carried into Task 12's dispatch,
and it belongs in the specification at Task 15.
and it belongs in the specification at Task 15.
Cost if wrong: an occasional retry on a path two operators reach simultaneously
Cost if wrong: an occasional retry on a path two operators reach simultaneously
for the same client, which in a three-person salon is rare.
for the same client, which in a three-person salon is rare.
Task 9: fix round 1/5 (4 addressed, 0 open; commits 2a53e24..5d152a5).
Task 9: fix round 1/5 (4 addressed, 0 open; commits 2a53e24..5d152a5).
Re-reviewer reproduced the backwards write in BOTH directions — 2026-01-05 with
Re-reviewer reproduced the backwards write in BOTH directions — 2026-01-05 with
the lock stripped, 2027-06-01 with it — and ran 25 trials of the new deadlock:
the lock stripped, 2027-06-01 with it — and ran 25 trials of the new deadlock:
25/25 a genuine Postgres-detected 40P01 with a real wait-for cycle, never a hang,
25/25 a genuine Postgres-detected 40P01 with a real wait-for cycle, never a hang,
exactly one side aborted each time, and the surviving side's value correct every
exactly one side aborted each time, and the surviving side's value correct every
time. The accepted trade holds.
time. The accepted trade holds.
Task 9: minor (deferred, FOR THE FINAL REVIEW): `order by 1` in the new
Task 9: minor (deferred, FOR THE FINAL REVIEW): `order by 1` in the new
`perform … for update` orders by the CONSTANT 1, not by id — EXPLAIN VERBOSE
`perform … for update` orders by the CONSTANT 1, not by id — EXPLAIN VERBOSE
shows a plan byte-identical to having no ORDER BY at all. My own instruction
shows a plan byte-identical to having no ORDER BY at all. My own instruction
prescribed it. It should read `order by id`. Measured as not changing today's
prescribed it. It should read `order by id`. Measured as not changing today's
deadlock rate (11/12 trials deadlock either way, the cause being structural —
deadlock rate (11/12 trials deadlock either way, the cause being structural —
most likely the FK check taking its own lock on the referenced client row before
most likely the FK check taking its own lock on the referenced client row before
the trigger runs) but the comment claims an ordering the code does not deliver.
the trigger runs) but the comment claims an ordering the code does not deliver.
Note: Tasks 11 and 12 use `order by id` correctly; only this one is wrong.
Note: Tasks 11 and 12 use `order by id` correctly; only this one is wrong.
Task 9: complete (commits 4310c83..5d152a5, review clean, 1 fix round).
Task 9: complete (commits 4310c83..5d152a5, review clean, 1 fix round).


## Ruling: the Important (the migration comment calls the lock order "not a
## Ruling: the Important (the migration comment calls the lock order "not a
convention that could be violated by a future caller", which is false) enters a
convention that could be violated by a future caller", which is false) enters a
fix round as a comment rewrite stating the guarantee and its limits precisely;
fix round as a comment rewrite stating the guarantee and its limits precisely;
the residuals are recorded there as obligations on future callers, not fixed.
the residuals are recorded there as obligations on future callers, not fixed.
Cost if wrong: a future feature (rebook, client merge) deadlocks until someone
Cost if wrong: a future feature (rebook, client merge) deadlocks until someone
reads the comment.
reads the comment.
Task 10: minor (deferred): 'survives a client deletion cascading through both'
Task 10: minor (deferred): 'survives a client deletion cascading through both'
would pass with the guard removed; its real subject is termination of the cascade.
would pass with the guard removed; its real subject is termination of the cascade.
Task 10: fix round 1/5 (1 addressed, 0 open — lock-order comment restated with
Task 10: fix round 1/5 (1 addressed, 0 open — lock-order comment restated with
the guarantee, its limits and the obligations on future callers; comment-only,
the guarantee, its limits and the obligations on future callers; comment-only,
no SQL changed; commits 0fff5ab..5ec9544).
no SQL changed; commits 0fff5ab..5ec9544).
Task 10: minor (deferred, FOR THE FINAL REVIEW, same fix as Task 9's): the new
Task 10: minor (deferred, FOR THE FINAL REVIEW, same fix as Task 9's): the new
comment cites "touch_client_activity's own `order by 1` discipline" — but
comment cites "touch_client_activity's own `order by 1` discipline" — but
`order by 1` orders by a constant and delivers no ordering (measured in Task 9).
`order by 1` orders by a constant and delivers no ordering (measured in Task 9).
When that becomes `order by id`, this comment becomes true; fix both together.
When that becomes `order by id`, this comment becomes true; fix both together.
Task 10: complete (commits 5d152a5..5ec9544, review clean, 1 fix round).
Task 10: complete (commits 5d152a5..5ec9544, review clean, 1 fix round).


## Ruling: fix round 1 covers (1) the comment rewritten to claim what the lock
## Ruling: fix round 1 covers (1) the comment rewritten to claim what the lock
buys — never both commit — and that 40P01 is expected under true concurrency;
buys — never both commit — and that 40P01 is expected under true concurrency;
(2) the test rewritten to force the dangerous overlap deterministically and
(2) the test rewritten to force the dangerous overlap deterministically and
assert the real property: at least one side fails and at least one linked
assert the real property: at least one side fails and at least one linked
active operator remains.
active operator remains.
## Ruling: the reviewer's Minor 5 is promoted into this round. Signed in as Vera,
## Ruling: the reviewer's Minor 5 is promoted into this round. Signed in as Vera,
the only active operator, `update operator set auth_user_id = '<uuid of no real
the only active operator, `update operator set auth_user_id = '<uuid of no real
account>'` was ALLOWED: the row stays "linked" (non-null) but matches nobody,
account>'` was ALLOWED: the row stays "linked" (non-null) but matches nobody,
and the salon is locked out. It is reachable from the Settings "link to an
and the salon is locked out. It is reachable from the Settings "link to an
account" screen, and it is exactly the lockout this task exists to prevent. The
account" screen, and it is exactly the lockout this task exists to prevent. The
guard counts only rows whose auth_user_id exists in auth.users.
guard counts only rows whose auth_user_id exists in auth.users.
Cost if wrong: a guard function that reads auth.users; it is security definer
Cost if wrong: a guard function that reads auth.users; it is security definer
owned by postgres, which can.
owned by postgres, which can.
Task 11: minor (deferred): a raw 40P01 can reach an operator when two deactivate
Task 11: minor (deferred): a raw 40P01 can reach an operator when two deactivate
at the same instant; the application write path must retry on 40P01 — the same
at the same instant; the application write path must retry on 40P01 — the same
obligation already recorded for Task 9.
obligation already recorded for Task 9.
Task 11: fix round 1/5 (3 addressed, 0 open — comment now claims "never both
Task 11: fix round 1/5 (3 addressed, 0 open — comment now claims "never both
commit" with 40P01 expected and a retry obligation; the concurrency test
commit" with 40P01 expected and a retry obligation; the concurrency test
rewritten to assert the real property, 10/10 red with the lock removed and 10/10
rewritten to assert the real property, 10/10 red with the lock removed and 10/10
green with it, readable assertion; the guard counts only auth_user_ids that exist
green with it, readable assertion; the guard counts only auth_user_ids that exist
in auth.users, relink-to-nonexistent refused 23514; commits 3505661..93e312a).
in auth.users, relink-to-nonexistent refused 23514; commits 3505661..93e312a).
Task 11: minor (deferred): relinking the last active operator to ANOTHER EXISTING
Task 11: minor (deferred): relinking the last active operator to ANOTHER EXISTING
account passes the guard — a per-operator lockout, not a salon one. In production
account passes the guard — a per-operator lockout, not a salon one. In production
only the three operators' accounts exist and auth_user_id is unique, so the
only the three operators' accounts exist and auth_user_id is unique, so the
reachable case is narrow.
reachable case is narrow.
Task 11: minor (deferred): operator-guard.test.ts leaves Annalisa and Alessandra
Task 11: minor (deferred): operator-guard.test.ts leaves Annalisa and Alessandra
inactive after the file runs (no teardown). Every file that depends on the roster
inactive after the file runs (no teardown). Every file that depends on the roster
calls resetData() in beforeEach, so nothing breaks today — but a future test file
calls resetData() in beforeEach, so nothing breaks today — but a future test file
that uses asOperator without resetData would inherit a deactivated roster.
that uses asOperator without resetData would inherit a deactivated roster.
Task 11: complete (commits 5ec9544..93e312a, review clean, 1 fix round).
Task 11: complete (commits 5ec9544..93e312a, review clean, 1 fix round).


## Ruling: fix round 1 covers both Importants, and promotes two Minors:
## Ruling: fix round 1 covers both Importants, and promotes two Minors:
- Minor 4 (move_visit and swap return success while changing nothing — outsider,
- Minor 4 (move_visit and swap return success while changing nothing — outsider,
  deactivated operator, nonexistent or concurrently deleted visit): promoted,
  deactivated operator, nonexistent or concurrently deleted visit): promoted,
  because plan 3's §10.2 must tell an operator "this appointment was deleted
  because plan 3's §10.2 must tell an operator "this appointment was deleted
  while you had it open", and a silent void success makes that indistinguishable
  while you had it open", and a silent void success makes that indistinguishable
  from a completed move. The functions raise when the target is not found/visible.
  from a completed move. The functions raise when the target is not found/visible.
- Minor 5 (a second call in the same explicit transaction fails because
- Minor 5 (a second call in the same explicit transaction fails because
  constraints stay immediate): promoted, one line per function
  constraints stay immediate): promoted, one line per function
  (`set constraints appointment_slot_unique deferred` at entry).
  (`set constraints appointment_slot_unique deferred` at entry).
- Minor 3 (concurrent swaps deadlock 25/60 because client locks follow caller
- Minor 3 (concurrent swaps deadlock 25/60 because client locks follow caller
  order): documented in the migration comment, not fixed — 40P01 is accepted.
  order): documented in the migration comment, not fixed — 40P01 is accepted.
Cost if wrong: an error where a no-op used to be silent; callers already handle
Cost if wrong: an error where a no-op used to be silent; callers already handle
errors from these functions.
errors from these functions.
Task 12: minor (deferred): write_exception_day silently drops a third column of
Task 12: minor (deferred): write_exception_day silently drops a third column of
a malformed range; write_exception_days returns 0 for a reversed or null range;
a malformed range; write_exception_days returns 0 for a reversed or null range;
the fortnight test checks only the count, not the rows.
the fortnight test checks only the count, not the rows.
Task 12: fix round 1/5 (5 addressed, 0 open — privilege tests now assert
Task 12: fix round 1/5 (5 addressed, 0 open — privilege tests now assert
has_function_privilege against the exact signatures and catch a grant to PUBLIC
has_function_privilege against the exact signatures and catch a grant to PUBLIC
too; swap's set-constraints covered by a new inside-transaction collision test;
too; swap's set-constraints covered by a new inside-transaction collision test;
move_visit and swap raise P0002 instead of a silent void success on a target
move_visit and swap raise P0002 instead of a silent void success on a target
that does not exist or is invisible; `set constraints appointment_slot_unique
that does not exist or is invisible; `set constraints appointment_slot_unique
deferred` at entry lets two calls share one transaction; the swap deadlock
deferred` at entry lets two calls share one transaction; the swap deadlock
documented; commits 57e8d40..16016ab, 135/135).
documented; commits 57e8d40..16016ab, 135/135).
Task 12: measured — a no-change move on a VISIBLE visit does not wrongly raise
Task 12: measured — a no-change move on a VISIBLE visit does not wrongly raise
P0002 (FOUND is true even when the UPDATE changes nothing); swap with one
P0002 (FOUND is true even when the UPDATE changes nothing); swap with one
nonexistent id raises P0002 before either UPDATE, so no half-swap; p_a = p_b
nonexistent id raises P0002 before either UPDATE, so no half-swap; p_a = p_b
stays a harmless no-op by the implementer's choice.
stays a harmless no-op by the implementer's choice.
Task 12: complete (commits 93e312a..16016ab, review clean, 1 fix round).
Task 12: complete (commits 93e312a..16016ab, review clean, 1 fix round).
Task 13: complete (commits 16016ab..1811205, review clean — spec ✅, no
Task 13: complete (commits 16016ab..1811205, review clean — spec ✅, no
Critical/Important; 143/143). Reviewer reproduced every check by measurement:
Critical/Important; 143/143). Reviewer reproduced every check by measurement:
guard removed → outsider and deactivated operator see all four accounts; return
guard removed → outsider and deactivated operator see all four accounts; return
type is exactly (id uuid, email text) with an exact-set column assertion; anon is
type is exactly (id uuid, email text) with an exact-set column assertion; anon is
denied at the FUNCTION boundary (42501) and has_function_privilege is false, so a
denied at the FUNCTION boundary (42501) and has_function_privilege is false, so a
stray grant to PUBLIC would be caught; owner is postgres with rolbypassrls (not
stray grant to PUBLIC would be caught; owner is postgres with rolbypassrls (not
rolsuper); proconfig is ['search_path=""']; no dynamic SQL and no arguments, so no
rolsuper); proconfig is ['search_path=""']; no dynamic SQL and no arguments, so no
injection surface; and every id it can return satisfies Task 11's auth.users
injection surface; and every id it can return satisfies Task 11's auth.users
existence guard by construction.
existence guard by construction.
Task 13: minor (deferred): the task report attributes the RLS bypass to a
Task 13: minor (deferred): the task report attributes the RLS bypass to a
superuser owner; measured, `postgres` has rolsuper = false and rolbypassrls =
superuser owner; measured, `postgres` has rolsuper = false and rolbypassrls =
true. Report prose only, no code effect.
true. Report prose only, no code effect.
Task 14: complete (commits 1811205..2a3a5b4, review clean — spec ✅, two Minors).
Task 14: complete (commits 1811205..2a3a5b4, review clean — spec ✅, two Minors).
Measured: cold start, two consecutive runs and `db reset` all give 143/143 with
Measured: cold start, two consecutive runs and `db reset` all give 143/143 with
no order dependency; 11 of 13 test files call resetData() in beforeEach and the
no order dependency; 11 of 13 test files call resetData() in beforeEach and the
other two never mutate state, which is a firmer basis than "nothing failed".
other two never mutate state, which is a firmer basis than "nothing failed".
Task 14: measured, and CARRY TO TASK 15 — `npx supabase stop` keeps a backup
Task 14: measured, and CARRY TO TASK 15 — `npx supabase stop` keeps a backup
volume by default (`"backup":true`), so the plan's literal Step 1 (stop, start,
volume by default (`"backup":true`), so the plan's literal Step 1 (stop, start,
test) would have restored the previous test-mutated database instead of
test) would have restored the previous test-mutated database instead of
rebuilding from migrations and seed, silently defeating the gate. The
rebuilding from migrations and seed, silently defeating the gate. The
implementer used `stop --no-backup`. The reviewer's preferred correction is to
implementer used `stop --no-backup`. The reviewer's preferred correction is to
drop stop/start from Step 1 entirely and use `npx supabase db reset && npm test`,
drop stop/start from Step 1 entirely and use `npx supabase db reset && npm test`,
which has no volume semantics to get wrong.
which has no volume semantics to get wrong.
Task 14: minor (deferred): CI pins Node 22, this machine runs v24.18.1, and
Task 14: minor (deferred): CI pins Node 22, this machine runs v24.18.1, and
nothing (.nvmrc or engines) pins or catches the mismatch.
nothing (.nvmrc or engines) pins or catches the mismatch.
Task 14: minor (deferred): the date-parser comment sits at the end of the
Task 14: minor (deferred): the date-parser comment sits at the end of the
workflow rather than next to the steps it explains.
workflow rather than next to the steps it explains.
Task 14: unverifiable without a GitHub remote: whether a real runner's
Task 14: unverifiable without a GitHub remote: whether a real runner's
`supabase start` seeds identically, Docker image pull within runner limits,
`supabase start` seeds identically, Docker image pull within runner limits,
setup-node cache behaviour, and CI's UTC clock against the date parser.
setup-node cache behaviour, and CI's UTC clock against the date parser.
Task 15: complete (commits 2a3a5b4..625bb3b, review clean — ZERO findings; the
Task 15: complete (commits 2a3a5b4..625bb3b, review clean — ZERO findings; the
reviewer re-measured every factual claim against the live catalogue and they all
reviewer re-measured every factual claim against the live catalogue and they all
held). Spec is at revision 5, with a new §15.1 naming what was re-reviewed
held). Spec is at revision 5, with a new §15.1 naming what was re-reviewed
against the running database and what was not.
against the running database and what was not.
Task 15: measured — 61 self-accusation sites in the spec; 3 verifiable (all
Task 15: measured — 61 self-accusation sites in the spec; 3 verifiable (all
blaming revision 4, checked against the first commit) and 58-60 UNVERIFIABLE
blaming revision 4, checked against the first commit) and 58-60 UNVERIFIABLE
because revisions 1-3 were never committed. The class is now declared in the
because revisions 1-3 were never committed. The class is now declared in the
header and no unverifiable accusation is phrased as if it had been measured.
header and no unverifiable accusation is phrased as if it had been measured.
Task 15: measured, correcting MY OWN dispatch: the auth.users existence check
Task 15: measured, correcting MY OWN dispatch: the auth.users existence check
lives in app.guard_operator_lockout (0009), NOT in app.is_active_operator, whose
lives in app.guard_operator_lockout (0009), NOT in app.is_active_operator, whose
body is `auth_user_id = auth.uid() and is_active` alone. Writing it my way would
body is `auth_user_id = auth.uid() and is_active` alone. Writing it my way would
have asserted a clause the database does not contain.
have asserted a clause the database does not contain.
Task 15: measured — §4.3's replacement text was itself false: it called the
Task 15: measured — §4.3's replacement text was itself false: it called the
function owner a superuser; `postgres` has rolsuper = false, rolbypassrls = true.
function owner a superuser; `postgres` has rolsuper = false, rolbypassrls = true.
Corrected in place.
Corrected in place.
ALL FIFTEEN TASKS COMPLETE. Next: final whole-branch review.
ALL FIFTEEN TASKS COMPLETE. Next: final whole-branch review.


## Ruling: one fix wave covering all five Importants plus the four Minors the
## Ruling: one fix wave covering all five Importants plus the four Minors the
reviewer marked fix-now (order by 1 -> order by id and its two false comments;
reviewer marked fix-now (order by 1 -> order by id and its two false comments;
afterAll(resetData) in operator-guard; client.test.ts's Temp operator wrapped in
afterAll(resetData) in operator-guard; client.test.ts's Temp operator wrapped in
a transaction; lock_timeout on the concurrency tests). The rest of the deferred
a transaction; lock_timeout on the concurrency tests). The rest of the deferred
list stays deferred with the reviewer's verdicts recorded.
list stays deferred with the reviewer's verdicts recorded.
Cost if wrong: the wave touches three migrations' privilege lines, two write
Cost if wrong: the wave touches three migrations' privilege lines, two write
functions, three test files and four spec/findings sentences — all reversible,
functions, three test files and four spec/findings sentences — all reversible,
all covered by the suite.
all covered by the suite.
