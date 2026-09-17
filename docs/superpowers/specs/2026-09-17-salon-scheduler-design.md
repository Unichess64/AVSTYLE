# AVStyle Salon Scheduler — Design Specification

**Date:** 2026-09-17
**Status:** Draft, revision 4 — incorporates three rounds of adversarial review
**Revision:** 4

> **How this document was built.** Revision 1 was examined by three independent
> adversarial reviewers (domain assumptions; time-model correctness;
> consistency, security and privacy). Revision 2 rewrote most of it and was
> examined again by two more (do the corrections actually work as database
> mechanisms; mechanical audit of every number, column and cross-reference).
> The second round found that the corrections had introduced new defects of
> their own — including one that made the application impossible to start.
> Revision 3 answered it and was reviewed again; the third round found the same
> pattern a third time, all of it in database detail that reading can surface
> but only a running migration can settle. Revision 4 answers round three and
> §15 says where that loop should stop.
>
> Decisions marked **(user)** in §2 were taken by the user. The rest are the
> author's and are negotiable.

---

## 1. Purpose

An internal appointment book for **AVStyle — Beauty Specialist**, Via Settevalli
133, Perugia. It replaces the paper diary. Clients never touch it; they book by
phone, on WhatsApp or in person, as they do today.

The app must answer two questions instantly, from a phone, while standing:

1. **What does the day look like?**
2. **Where is there room?**

Everything else in this document exists to serve those two questions.

### 1.1 The salon today

| Operator | Services |
|---|---|
| Vera | Nails |
| Annalisa | Nails |
| Alessandra | Laser hair removal, waxing, massage, machine treatments, reflexology, pedicure, facials, colour analysis and image consulting |

Alessandra covers seven families of service against the nail technicians' one.
That asymmetry is why §6.1's who-does-what table and the category grouping in the
service picker earn their place: without them, whoever answers the phone has to
hold the whole catalogue in their head.

---

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Internal use only; no client-facing booking | **(user)** Replace the paper diary |
| D2 | Mobile-first web app | **(user)** Consulted standing; availability entered from home |
| D3 | Catalogue duration is a proposal, overridable per appointment | **(user)** |
| D4 | The service catalogue is built inside the app | **(user)** No list exists yet |
| D5 | Weekly availability + per-date exceptions + salon closures | **(user)** |
| D6 | Several time ranges per day | **(user)** Split shifts are two ranges |
| D7 | No shared resources modelled | **(user)** See §12.6 for the corrected revisit trigger |
| D8 | Client record: name, phone, birthday (month + day), preferred operator, message opt-out | **(user)** on the first three; the rest added in rev. 2–3 |
| D9 | Birthday greetings are sent by a person | **(user)** Avoids the WhatsApp Business API, template approval and per-message cost |
| D10 | No roles: every account can do everything | **(user)** |
| D11 | Three accounts with identical permissions | **(user)** Costs the same as one shared account and makes offboarding, attribution and session revocation possible |
| D12 | The logged-in account supplies the default operator; overridable per device | |
| D13 | The column day view is the default landing screen; the list is a per-device preference that persists once chosen | Rev. 2 said "columns always" and then made the toggle sticky, which is a contradiction. This states what actually happens |
| D14 | No money: no prices, no payments, no takings | |
| D15 | Hard delete; no statuses, no no-show tracking, no change log | **(user)** |
| D16 | 5-minute cells | **(user)** 10-minute cells cannot express 15, 45, 75 or 105 minutes |
| D17 | Operator double-booking is prevented in the database — §6.4 | |
| D18 | Booking outside declared availability is allowed with a warning | **(user)** Reachable by an explicit path — §8.4 |
| D19 | Full scope before first use | **(user)** |
| D20 | Next.js + Supabase + Vercel | **(user)** |
| D21 | Client data deleted after 24 months of inactivity, on confirmation | **(user)** Period proposed, pending §14 |
| D22 | No offline operation | |
| D23 | A visit groups several services | **(user)** "Manicure + pedicure" is the normal booking |
| D24 | No attended/total split for unattended treatments | **(user)** Declared limit §12, item 7 |
| D25 | Booking one client in two places at once warns, does not block | **(user)** |
| D26 | No free-text field about a client or an appointment | **(user)** A "write nothing medical here" rule is not a control; removing the field removes the vector |
| D27 | No non-client calendar entries | **(user)** Declared limit §12, item 8 |
| D28 | Service duration may be overridden per operator | Two nail technicians do not work at the same speed; without it the finder proposes the same length for both |
| D29 | **Writes spanning more than one appointment go through a transactional database function**, not through several client calls | Rev. 2 relied on a deferred constraint to make a swap possible. On PostgREST each call is its own transaction, so a deferred constraint buys nothing across calls and the swap stayed impossible |
| D30 | **The three operator rows are seeded by migration**, not created at first run | Rev. 2's security fix made access depend on a row in `operator`, and the first run could therefore never write the first row. The salon's three people are known; seeding them is honest and the deadlock disappears |
| D31 | Visual identity follows the AVStyle brand — §9.12 | |

### 2.1 Language convention

Chat in Italian; specification, documentation, code, identifiers and commit
messages in English. Interface strings in Italian.

---

## 3. Out of scope

- Client self-booking, client accounts, public pages (D1)
- Automated messaging of any kind (D9)
- Prices, payments, takings, till integration, invoicing (D14)
- Clinical notes, consent forms, before/after photos, deliberately recorded
  health data. The record of **which services a client received** is in scope and
  displayed (§9.6); whether that record is itself special-category data is §14's
  first question
- Shared physical resources (D7)
- Appointment statuses, cancellation history, change log (D15)
- Non-client calendar entries (D27)
- Stock, products, suppliers
- Offline operation (D22)
- Native mobile applications
- Importing the paper diary. Run both books in parallel for the first week — a
  rollout instruction, not a feature

---

## 4. Architecture

### 4.1 Shape

A Next.js application (App Router), mobile-first, on Vercel (D20). Added to the
phone home screen through a **web app manifest only — no service worker**, which
would cache authenticated responses and leave a readable client list on a lost
phone.

### 4.2 Accounts

Three accounts, one per operator, with identical permissions (D11). Not a role
system: nobody can do anything another cannot.

Self-service signup, anonymous sign-in and every OAuth provider are **disabled**.
The accounts are created from the Supabase dashboard, with long generated
passphrases in the salon's password manager.

### 4.3 Access control

Revision 1 used `auth.uid() is not null`, which is satisfied by **any** Supabase
user — and with signup at its default setting, anyone could have registered and
read the whole client list from the REST endpoint. Revision 2 bound the predicate
to a row in `operator` and thereby created two new failures: a policy on
`operator` that reads `operator` **recurses** (`42P17`), and with `operator`
empty at first run **nobody could write the first row**.

Revision 3:

```sql
create function app.is_active_operator() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.operator o
    where o.auth_user_id = auth.uid() and o.is_active
  )
$$;
```

The migration must also contain, and revision 3 omitted all three — without them
it does not even run:

```sql
create schema app;
grant usage on schema app to authenticated;
alter table <every table> enable row level security;
```

Without `create schema app` the migration fails outright. Without the `grant`,
every policy call raises *permission denied for schema app*, so the app errors
rather than returning nothing — which makes §4.4's account of deactivation
wrong. And **a policy on a table without row-level security enabled is inert**:
on Supabase, migration-created tables do not have it on by default and
`authenticated` holds the default grants, so omitting it silently reopens
revision 1's hole.

The function is owned by the migration role (`postgres`), recorded in the
migration as §6.4 records the trigger's owner.

**Why the recursion goes away.** It is not `security definer` by itself:
row-level security is bypassed by the **owner** of the table, and the function's
owner also owns `public.operator`. Revision 3 attributed it to the wrong
mechanism.

Revision 4 then over-corrected, claiming that `alter table operator force row
level security` would bring `42P17` straight back. **Measured on a live
PostgreSQL by a reviewer of the foundations plan, that is wrong in both
directions:** with the superuser owner Supabase actually uses, `force row level
security` is inert; with a genuinely `nobypassrls` owner it raises `54001`,
stack depth exceeded, not `42P17`. `42P17` comes only from a policy whose
expression names its own table directly — which is the shape the helper
function exists to avoid.

The practical rule is unchanged — do not add `force row level security` on
`operator`, and keep the helper — but the reason is ownership, and the failure
mode would be stack exhaustion. The audit test of the foundations plan measures
this for itself.

`set search_path = ''` is mandatory and not decoration: a `security definer`
function with a mutable search path is the textbook privilege-escalation route,
and Supabase's own linter flags it. The body is fully schema-qualified
(`public.operator`, `auth.uid()`), so it resolves under an empty path.

Every table's policy is `app.is_active_operator()`.

**This is an authentication gate expressed in the row-level-security layer, not
row-level security** — the predicate is identical for every table, every verb and
every row. Calling it RLS would overstate it.

**Bootstrap (D30).** The three operator rows are created by a seed migration.
Linking each to its Supabase account is a one-off statement run in the SQL
editor after the accounts exist, recorded in the repository's README. A fourth
operator added later is linked from Settings by an operator who is already
active, so the deadlock cannot recur.

### 4.4 What deactivation does, and does not do

Deactivating an operator makes `app.is_active_operator()` false for her, so every
query returns nothing — immediately, even from a phone holding a live session.
That is a real improvement on a shared password, which revision 1 wrongly claimed
could be rotated to the same effect (Supabase refresh tokens survive a password
change).

But two things must follow, or the improvement is cosmetic:

- **The middleware checks `is_active` and signs the session out.** Under
  row-level security a deactivated operator does not get a 401; she gets **zero
  rows**, and the app looks like a salon that has lost all its data. Two
  reviewers reached this independently.
- **Every server action re-checks it** — see §11.5. An export running with
  elevated privileges behind a mere session check would hand a departing
  operator the entire client list, which is the revision-1 hole reopened in the
  one section its fix did not touch.

### 4.5 Default operator

The logged-in account maps to an `operator` row and becomes the default: the day
view emphasises her column, availability editing opens on her. Overridable per
device for the salon tablet. It protects nothing; if browser storage is cleared
the app falls back to the account's own operator.

**The operator on an appointment is always an explicit field**, never inferred
from the session.

### 4.6 Transactional writes (D29)

Any write touching more than one appointment — moving a multi-service visit,
swapping two appointments between operators — is a single Postgres function
invoked by RPC, so it is one transaction.

Revision 2 instead declared the occupancy constraint `DEFERRABLE` and claimed
that made a swap possible. It did not: on PostgREST each call is its own
transaction, so the first update's commit collides with cells the second has not
yet freed. The worked case is ordinary — Vera's visit of manicure 10:00–11:00
(cells 120–131) plus pedicure 11:00–12:00 (cells 132–143), moved half an hour
later: the first update's new cells 126–137 collide with the pedicure still
sitting at 132–143, and the call aborts. Moving a two-service visit — which D23
calls the normal booking — would have failed every time.

`DEFERRABLE INITIALLY DEFERRED` is still correct, but **for a different reason**:
inside one statement the row-level `AFTER` trigger fires per row, so the first
row's inserts collide with the second row's not-yet-deleted cells. Recording the
right reason matters, because the wrong one would lead an implementer to believe
separate round trips are enough.

Before committing, the function issues `SET CONSTRAINTS ... IMMEDIATE` so a
violation surfaces **inside** the transaction, where it can be caught and turned
into the sentence of §10.1 rather than an opaque error at commit.

---

## 5. Time model

**5-minute cells** (D16).

| Concept | Value |
|---|---|
| Cell 0 | 00:00–00:05 |
| Cell 96 | 08:00–08:05 |
| Cell 240 | 20:00–20:05 |
| Cells in a day | 288 (indices 0–287) |
| Boundaries in a day | 0–288 |

15 min = 3 cells, 45 = 9, 50 = 10, 90 = 18, 120 = 24. A 10-minute grid could
express none of 15, 45, 75 or 105.

**Two domains, two names.**

- A **cell index** identifies a five-minute block: 0–287.
- A **boundary index** identifies an instant between blocks: 0–288.

Availability ranges are `[start_boundary, end_boundary)`, end exclusive.
Appointments are `start_cell` plus `cell_count`. **They are never compared
directly**: an appointment fits a range when
`start_cell >= start_boundary and start_cell + cell_count <= end_boundary`.
Revision 2 twice wrote comparisons mixing the two domains and got the right
answer by luck of the example; that is precisely the off-by-one this section
exists to prevent.

The conversion module accepts **0–288** and is the only place cells become clock
times. `start_cell + cell_count <= 288`: no appointment crosses midnight.

### 5.1 Dates and time zone

Dates are calendar dates, never absolute instants, so daylight saving never moves
an appointment: 10:00 on 29 March stays 10:00.

**"Today" is the civil date in `Europe/Rome`**, computed on the client and passed
into the functions that need it — Vercel runs UTC, and a server-derived date is
wrong for an hour or two every night.

**Exception: the retention cutoff (§11.4) is computed server-side.** A destructive
sweep over personal data must not take its date from the browser.

### 5.2 Weekday convention

`weekday` is 0 = Monday … 6 = Sunday. Both platform defaults disagree, so both
mappings live in the one module:

- SQL: `extract(isodow from d) - 1`
- TypeScript: `(d.getDay() + 6) % 7`

A naive `dow` or `getDay()` shifts every operator's availability by a day,
silently.

---

## 6. Data model

Thirteen tables.

### 6.1 Operators and services

**`operator`** — `id`, `auth_user_id` (nullable, unique), `name`, `color`,
`is_active`, `sort_order`.

Seeded with Vera, Annalisa and Alessandra (D30).

**The salon cannot be locked out of its own database.** A constraint trigger on
`operator` takes `select ... for update` on the table's active rows and then
refuses any write that would leave **zero rows with `is_active` and a non-null
`auth_user_id`**. Three things revision 3 got wrong here and this corrects:

- It guarded `is_active` only. Access also requires `auth_user_id`, so pressing
  *scollega* in Settings produces the identical lockout.
- It was stated in prose, in a document that elsewhere condemns exactly that.
- It would have raced: Vera deactivating Annalisa while Annalisa deactivates
  Vera, each seeing the other still active, both committing, nobody left. The
  row lock is what makes the guard real.

**`service_category`** — `id`, `name`, `sort_order`. Managed in Settings.
Revision 2 said the category was "constrained to a fixed list" while D4 says no
list exists yet; a table resolves that rather than hard-coding an enum.

**`service`** — `id`, `name`, `category_id`, `default_duration_cells` (`> 0`),
`buffer_after_cells` (default 0), `is_active`, `sort_order`. Both `sort_order`
columns are set from Settings (§9.9).

`buffer_after_cells` is the turnaround **after** this service — cleaning the
cabin, changing the couch paper, letting the client dress. It is advisory:
applied when proposing (§7.3), never enforced as occupancy.

**`operator_service`** — `operator_id`, `service_id`, `duration_cells`
(nullable override, `> 0` when set, D28). Primary key on the pair.

**`salon_settings`** — a single row (primary key constrained to a constant):
`day_start_boundary`, `day_end_boundary`. These bound the agenda's vertical
extent. Without them §9.1 has no defined window and would render forty-eight
half-hour rules on a phone.

### 6.2 Clients

**`client`** — `id`, `full_name`, `phone` (nullable, normalised to E.164),
`birth_month`, `birth_day`, `preferred_operator_id` (nullable),
`no_messages` (default false), `created_at`, `last_activity_at`.

**No free-text field** (D26).

`preferred_operator_id` is set on the client form (§9.6) and read by the finder
(§8.3): clients belong to *their* nail technician, and without it the finder
routinely offers Vera's client to Annalisa. It is personal data and is listed as
such in §11.1.

`no_messages` records an objection to the birthday greeting and is toggled on the
client form. A field that encodes a data-subject objection and has no way to be
set is a compliance gap, not a UI omission.

`phone` is normalised to E.164 because §9.7 offers a WhatsApp link, which
`347 1234567` does not open.

#### 6.2.1 Birth date

The **birth year is not collected**: it is not needed for greetings, clients give
it reluctantly, and a fabricated year would eventually be read as true.

Both fields are set or both null. The (month, day) pair is validated against an
explicit table of days per month with February at 29 — **not** by constructing a
date, which raises rather than returning false and cannot be handled by a form.

**Leap-year rule:** a client born on 29 February appears on 28 February in
non-leap years.

**Window rule:** a (month, day) pair has no ordering across a month or year
boundary, so "this week" generates the seven pairs of the window and matches on
the set. A `BETWEEN` is wrong twelve times a year, and wrong across 31 December.

The two rules compose: in a non-leap year the generated set never contains
`(2, 29)`, so **whenever the window contains `(2, 28)` the pair `(2, 29)` is
injected into it**. The same injection applies to the month view. Revision 3
stated both rules and left them unable to meet.

#### 6.2.2 `last_activity_at`

The column is a **`date`**, not a timestamp: it is assigned from
`visit.visit_date` and compared against a date in §11.4, and a `timestamptz`
would silently drag the comparison into the session's zone — UTC on Vercel —
against everything §5.1 establishes.

A trigger on **insert, update and delete of both `appointment` and `visit`** sets
it to the greatest `visit.visit_date` across the client's visits, **future
included**. Revision 2 fired it on `appointment` only, so moving a visit from next
week to next year left it stale — on a value that governs the deletion of
personal data.

Retention eligibility uses `coalesce(last_activity_at, created_at::date)`, so a
client created mid-booking and never confirmed is not exempt for ever.

### 6.3 Visits and appointments

**`visit`** — `id`, `client_id` (fk, `on delete cascade`), `visit_date`, plus
`unique (id, visit_date)`.

**`appointment`** — `id`, `visit_id`, `operator_id`, `service_id`,
`appointment_date`, `start_cell` (0–287), `cell_count`
(**`> 0`** and `start_cell + cell_count <= 288`), `updated_at`, plus
`unique (id, operator_id, appointment_date)`.

Every appointment belongs to a visit; a single-service booking makes a visit of
one, so there is no nullable branch. A visit may span operators.

**The date is bound, not merely described:**

```sql
foreign key (visit_id, appointment_date)
  references visit (id, visit_date) on update cascade on delete cascade
```

`on delete cascade` is not decoration. Revision 3 wrote this key with
`on update cascade` alone, which leaves `on delete no action` — so deleting a
visit raised a foreign-key error, and §11.3's promise that a client's deletion
"cascad[es] through visits, appointments and cells" described a failure. The
right of erasure was not executable.

Revision 2 wrote "equal to the visit's date" in a table cell and enforced
nothing, so a single PATCH could put the occupancy key on one date and the visit
on another — four subsystems reading two dates for one appointment. The composite
key also makes moving a whole visit atomic: update `visit_date` and the cascade
carries the appointments.

**An orphan visit is impossible.** An `AFTER DELETE` trigger on `appointment`
takes `select ... from visit where id = OLD.visit_id for update` **first**, then
deletes the visit if no appointments remain.

The row lock is the whole mechanism. Revision 2 left this to application logic
and revision 3 moved it into a trigger while changing nothing that matters: at
`READ COMMITTED`, two operators deleting the two halves concurrently each still
see the other's uncommitted survivor, neither deletes, and the orphan's future
date keeps its client out of the retention sweep for ever — the defect §6.2.2
exists to close. Moving logic into the database does not serialise it; taking a
lock does.

**`appointment_slot`** — `appointment_id`, `operator_id`, `appointment_date`,
`cell_index`; primary key `(appointment_id, cell_index)`.

### 6.4 The occupancy guarantee

Revision 1 called double booking "impossible to write" while granting the
application write access to the table that made it impossible — a convention,
not a guarantee. Revision 2 replaced it with four measures, two of which named
mechanisms Postgres does not provide and one of which revoked a privilege five
other sections depend on.

Revision 3:

1. **Unique constraint** on `(operator_id, appointment_date, cell_index)`,
   `DEFERRABLE INITIALLY DEFERRED` — for the reason given in §4.6, not the one
   revision 2 gave.

2. **`REVOKE INSERT, UPDATE, DELETE ON appointment_slot FROM authenticated, anon`.**
   Revision 2 wrote `REVOKE ALL`, which also removes `SELECT` — and the table is
   read by the availability query (§7.5), the narrowing check (§7.6), the
   conflict pre-check (§10.1) and the day view itself. The application must read
   it and must not write it.

3. **A composite foreign key**, which is what revision 2 called a check
   constraint and could not have been one (a `CHECK` cannot read another row):

   ```sql
   foreign key (appointment_id, operator_id, appointment_date)
     references appointment (id, operator_id, appointment_date)
     on update cascade on delete cascade
   ```

   Drift between child and parent becomes unrepresentable rather than merely
   verified by the code that caused it. Revision 2's version had the trigger
   check its own output against its own input — tautological.

4. **The trigger is pinned verbatim**:
   `AFTER INSERT OR UPDATE OR DELETE ON appointment FOR EACH ROW`, **no column
   list**, **no `ON CONFLICT DO NOTHING`**, `SECURITY DEFINER` with
   `SET search_path = ''`, owned by the migration role, named
   `zz_sync_appointment_slots`, and deleting its old rows **by
   `appointment_id` alone**.

   The delete predicate is load-bearing: one that also matches on `operator_id`
   and `appointment_date` misses rows the foreign key's cascade has already
   rewritten, after which the re-insert violates the primary key.

   **Two claims revisions 3 and 4 made here have since been measured false**, by
   a reviewer of the foundations plan working against a live PostgreSQL:

   - **The `zz_` name prefix is not load-bearing.** Renaming the trigger so it
     sorts before the referential-integrity triggers changed nothing: update,
     reassignment and delete all still behaved. The prefix is kept as cheap
     insurance against a firing order nothing should depend on, but it proves
     nothing and the spec no longer says it does.
   - **"No column list" is largely shadowed by measure 3.** Because the
     composite foreign key carries `on update cascade`, a reassignment rewrites
     the child rows by itself even with the trigger disabled. A column list on
     `(start_cell, cell_count)` would therefore *appear* to work. The rule is
     kept — the trigger must own its rows, and relying on a cascade to repair
     what a trigger should have written is the drift this section exists to
     prevent — but its justification is discipline, not a failure anyone has
     observed.

   This is §15 working as intended: two paragraphs of confident reasoning,
   settled in the opposite direction by an hour with a database.

Measure 4 is not pedantry. `AFTER UPDATE OF start_cell, cell_count` looks like an
optimisation, and under it reassigning an appointment from Vera to Annalisa
regenerates nothing: Vera's cells stay busy for an appointment that is no longer
hers, Annalisa's are free underneath one that is — a double booking visible on
screen and invisible to the constraint.

**Out-of-hours is computed, for today and future dates only.** When Alessandra
stops working Saturdays, every Saturday she ever worked must not re-render as
out-of-hours: the system has no evidence for that claim. This applies to the
**hatching in §9.1 as well as to the marker** — revision 2 fixed the marker and
left the hatching unqualified, which was worse than before, since a past
appointment then looked normal on a background asserting the salon was shut.

### 6.5 Availability

**`weekly_availability`** — `id`, `operator_id`, `weekday`, `start_boundary`,
`end_boundary` (`> start_boundary`, `<= 288`), with overlap **enforced**:

```sql
EXCLUDE USING gist (
  operator_id WITH =, weekday WITH =,
  int4range(start_boundary, end_boundary) WITH &&
)
```

(requires `btree_gist`). Revision 1 stated this rule in prose only, in a document
whose organising principle was that rules should be impossible to break.

**`exception_day`** — `id`, `operator_id`, `exception_date`, unique on the pair.

**`exception_range`** — `id`, `exception_day_id` (fk, `on delete cascade`),
`start_boundary`, `end_boundary` (`> start_boundary`, **`<= 288`**), with its
own exclusion constraint keyed on `exception_day_id`:

```sql
EXCLUDE USING gist (
  exception_day_id WITH =,
  int4range(start_boundary, end_boundary) WITH &&
)
```

Revision 3 said "the same exclusion constraint" and pointed at one keyed on
`operator_id` and `weekday`, neither of which this table has. Revision 2 dropped both the upper bound and the
primary key in the split, leaving `[0, 30000)` writable and a single range
unaddressable by the editor that is supposed to delete it.

**There is no `is_absent` flag.** An `exception_day` replaces the day; **zero
ranges means away.** Revision 2 kept a flag, which made `is_absent = false` with
zero children resolve identically to `is_absent = true` — the meaningless row it
claimed to have eliminated, renamed — and required a check reading across two
tables, which Postgres cannot express. Removing the flag makes the two states one
state.

**An exception day and its ranges are written in one transaction**, through the
same kind of database function as §4.6. Two separate calls would mean that a
request which hangs after the first — the case §10.3 singles out as the
dangerous one — leaves the operator marked away all day, in a state
indistinguishable from a deliberate absence. Collapsing *declared absence* with
*half-finished write* is worse than the ambiguity this model was built to
remove, and §7.6's conflict check must run against the **intended** ranges, not
against the empty set that would exist between the two writes.

Consequence, stated because it surprised a reviewer: deleting an exception's last
range leaves the operator **away** that day. Deleting the *exception itself* is a
separate action in §9.8 ("torna all'orario abituale"), and the editor labels a
childless exception day as *assente* so the state is never silent.

**Multi-day absence** is written in bulk from a date range (§9.8): two weeks of
holiday entered one date at a time guarantees a missed day that leaves the
operator silently bookable.

**`salon_closure`** — `id`, `start_date`, `end_date` (`>= start_date`),
`from_boundary`, `to_boundary` (both nullable), `reason`.

Constraints, all writable as plain checks and all left in prose by revision 2:
both boundaries null or both set; `to_boundary > from_boundary`; both `<= 288`.
With both null the closure covers whole days; with both set the window
`[from_boundary, to_boundary)` is cut out of **every date in the range** — which
is how **24 December until 13:00** and a whole week of reduced hours are both
expressed. Revision 3 restricted a partial closure to a single date, in the same
paragraph that warns against entering days one at a time.

Overlapping closures are harmless (the union is the right answer) and are not
constrained.

`reason` is displayed on the day view: without it a closure renders as dimmed
columns indistinguishable from everyone happening to be off. It describes the
salon, not a client, so D26 does not reach it.

### 6.6 Precedence

**Salon closure beats exception day beats typical week.** This governs
**availability resolution**, not bookability: D18 still permits booking into a
closed day by the explicit path of §8.4.

---

## 7. Availability resolution and the finder

### 7.1 Resolving a day's ranges

For a date and an operator, producing a **list of ranges** — not a flat set of
cells, because §7.3 needs the boundaries:

1. Take `weekly_availability` for that weekday.
2. If an `exception_day` exists for that date, its ranges replace the day's
   entirely (zero ranges = away).
3. Subtract any `salon_closure` window: whole-day closures empty the list,
   partial closures cut the window out of each range.
4. **Canonicalise:** sort by start, then **fold** — while `end_prev >= start_next`,
   merge into `[start_prev, max(end_prev, end_next))`. A pairwise pass rather
   than a fold produces overlapping output on three touching ranges.

### 7.2 Why step 4 exists

Nothing stops an operator entering 9:00–12:00 and 12:00–15:00 as two ranges —
they do not overlap, so both are legal, and the editor lets her drag an edge
until they meet.

With 5-minute cells: ranges `[108, 144)` and `[144, 180)` are 09:00–12:00 and
12:00–15:00, a continuously available morning. A 50-minute massage is 10 cells;
starting at cell 140 (11:40) it occupies cells 140–149, so
`140 + 10 = 150 > 144` and it fits neither range. Without folding, the starts
from 135 to 143 — 11:15 to 11:55 — are all refused on a break that does not
exist. Folding merges the pair into `[108, 180)` and they become bookable.

A real lunch break, `[108, 156)` and `[180, 228)`, does not fold, and the
same-range rule keeps working as intended.

### 7.3 Proposing start times

For a duration of N cells, a proposable start is a cell from which N consecutive
free cells run, all inside the same folded range, **and clear of a turnaround at
both ends**: after the preceding appointment, by that appointment's service's
`buffer_after_cells`; and before the following one, by the proposed service's
own.

**The rule is symmetric, and each earlier revision had one half of it.**
Revision 2 honoured only the proposed service's trailing buffer, and only when
something followed — so Alessandra's massage ending at 11:00 with a 15-minute
turnaround was followed by a waxing proposed at 11:00, with nothing in between.
Revision 3 honoured only the preceding appointment's — so a waxing proposed at
11:00 with nothing before it, and a manicure already booked at 11:30, again left
no turnaround, the same damage from the other side.

**This is a proposal policy, not an invariant.** §8.1's tap-a-cell path bypasses
proposal, so a straddling appointment is writable — and under D18 that is correct.

For a multi-service visit (D23) the proposal takes a **list of durations** that
must run contiguously, with each service's buffer between them.

### 7.4 The function's contract

```
proposeStarts({
  date,                  // which day these cells belong to
  ranges,                // folded, from §7.1
  occupancy,             // [{ appointmentId, startCell, endCell, bufferAfterCells }]
  durations,             // one or more, in order
  buffers,               // the proposed services' own trailing buffers
  nowCell,               // null unless date is today
  excludeAppointmentIds, // the appointments being moved, if any
  dayStatus              // 'open' | 'salon_closed' | 'operator_off'
}) -> { starts, reason }
```

**`occupancy` carries blocks, not bare cells**, because §7.3's rule needs the
preceding appointment's own `buffer_after_cells` and a flat set of taken cells
cannot supply it. Revision 3 rewrote the rule and left the contract unchanged,
so it produced the identical wrong answer on the identical example it used to
condemn revision 2 — and the test it added for the case was not writable against
the signature it gave.

**`excludeAppointmentIds` is a list**, because §8.6 moves a whole visit: with a
single id, the visit's other appointments still read as occupied and the move
revision 4's transactional function exists to enable is never even proposed.

Four things revision 2 got wrong here:

- **exclusion was missing entirely**, so an appointment's own cells blocked
  every start inside its own duration: moving it by one cell was impossible, and
  forcing it through produced §10.1's message naming *the appointment being
  dragged* as its own blocker.
- **`nowCell` was missing.** Revision 1 forbade the function from reading the
  clock, which is the right instinct as the wrong rule: nothing filtered past
  times, so at 14:00 the finder offered *today, 10:00*. Passing the time in keeps
  the function pure, which is the property actually wanted.
- **`date` was missing**, although the finder returns results across four weeks
  in date order and the return type was bare cell numbers.
- **`dayStatus` was missing**, yet revision 2's test list required distinct
  reason codes for "salon closed" and "the operator does not work that day" —
  which §7.1 has already folded into the same empty array. The distinction has to
  be passed in; it cannot be recovered.

`reason` distinguishes open-but-full, salon closed, operator off, and service
longer than any range. On the phone those are four different sentences.

`dayStatus` is `'salon_closed'` whenever a closure — whole-day **or partial** —
leaves the day with no ranges. Otherwise a 24 December closed from 13:00, on a
day Alessandra worked 09:00–13:00, would report "open but full" for a shut
salon.

The eligible-operator set is resolved by the caller from `operator_service`,
**restricted to active operators**. Without that restriction the finder keeps
offering appointments with someone who left last month.

### 7.5 Query shape

One query takes a **date range** and returns ranges and occupancy for all
operators in it. The finder searches 28 days (§8.3); a per-day query would be
dozens of round trips on the one path where latency is the point.

### 7.6 Narrowing availability with bookings inside it

Every write that reduces availability — a closure, an absence, a shortened range,
**or deactivating an operator**, which is the most drastic of them and lives in
Settings rather than in the availability screen — first queries
`appointment_slot` for the affected operator-dates and **lists the conflicting
appointments with their clients' phone numbers**. The salon may then proceed;
somebody has to make the calls.

This is a check across two transactions, not a hold inside one: a human decision
cannot sit inside an open transaction. Somebody may book into the window between
the list and the confirmation. That is acceptable here — the list is a prompt to
make phone calls, not a lock — but it must be said, in a document that elsewhere
takes revision 2 apart for assuming several calls share a transaction.

Without this, adding a closure for 10–20 August on the 10th silently orphans
three clients who arrive on the 15th at a shut salon.

---

## 8. Booking flows

### 8.1 From the calendar — the everyday path

Tap a space in Annalisa's column at 15:00. A sheet opens with operator and time
filled in. Choose a service — grouped by category, showing what Annalisa does,
with a *"mostra tutti i servizi"* escape for the day she covers something
outside her usual list. The duration fills in from `operator_service.duration_cells`
**where set, otherwise from `service.default_duration_cells`** (D3, D28), and is
editable. Find the client, or create her. **Add another service** to the same
visit and it is appended after the previous one, leaving that service's
turnaround between them. "Contiguous" in §9.1 means *in sequence with only
turnaround between*, not *cell-adjacent*: a visit with a non-zero buffer still
renders as one block.

Spaces outside availability are dimmed but **tappable** (§8.4).

### 8.2 Creating a client mid-flow

Three fields: name, phone, birthday. One line of text states that her details are
being recorded and where the full notice is — without it §11.1 would assert an
obligation no screen fulfils.

Before saving, the app looks for a likely duplicate — same phone, or a close name
match, accent- and case-insensitive — and offers the existing record. Without
this, a search for "Maria Rossi" misses "maria rosi", a second Maria is created
under phone pressure, her history splits, she appears twice among the birthdays,
and the retention sweep eventually deletes half of her.

Accent-insensitive search is indexed through an **immutable wrapper** around
`unaccent`, which is not itself immutable and cannot otherwise be indexed.

### 8.3 The finder — the ringing-phone path

Choose the service or services. The app shows the earliest free starts across
every operator who performs them, in date order, over a rolling **28-day**
horizon, paged, with the reason code of §7.4 when nothing is found and an option
to extend.

If a client has already been chosen — from her record, or picked first in the
sheet — her `preferred_operator_id` sorts to the top and the rest are labelled
*"con un'altra operatrice"*. When no client has been chosen yet, no preference
applies; revision 2 sorted by a client the flow had not yet asked for.

Proposals never include out-of-availability cells. D18 permits *booking* there
deliberately; proposing there would make every closed day look open.

### 8.4 Booking outside availability (D18)

Two explicit paths, because revision 2 asserted this decision in four places and
provided no way to reach it — out-of-hours space was not described as tappable
and the finder excluded it:

- **Tap a dimmed cell** in the day view. A warning names why it is outside —
  operator off, outside her hours, salon closed — and asks for confirmation.
- **In the finder**, a *"cerca anche fuori orario"* switch, off by default.

Such appointments are marked out-of-hours on today's and future days only
(§6.4).

### 8.5 One client in two places at once

The constraint keys on the operator, so nothing stops Maria being booked with
Vera at 10:00 and Alessandra at 10:30 — two operators answering two calls produce
exactly that. On save the app checks her other appointments that day and **warns**
(D25): *"Maria Rossi è già prenotata alle 10:00 con Vera"*. It does not block.

### 8.6 Moving

By dragging (armed by a long press, to disambiguate from the day swipe and the
vertical scroll) or by editing the sheet. A multi-service visit moves as a unit
through the transactional function of §4.6; a single service within a visit can
be moved alone. The destination is checked with `excludeAppointmentIds` covering every appointment being written, so an
appointment never blocks itself.

### 8.7 Deleting

One confirmation, then gone (D15). Deleting a visit removes its appointments and
their cells; deleting the last appointment of a visit removes the visit
(§6.3). See §10.4.

---

## 9. Screens

Ten screens, each with a stated route.

### 9.1 Agenda — day in columns (landing screen)

One column per operator who is either active or still holds appointments on the
day being shown, hours down the side on a 30-minute rule.

The vertical window starts at `salon_settings.day_start_boundary` /
`day_end_boundary` and **expands to contain everything actually on the day** —
availability and appointments alike. Without that expansion an appointment
booked outside salon hours under D18 would be created and then never rendered,
and the first of §8.4's two explicit paths would be unreachable for the hours it
exists to serve.

Appointments are blocks in the operator's colour. **A visit renders as one block
only when its appointments are contiguous and share an operator**; otherwise each
appointment is its own block, joined by a small visit marker and the client's
name. Revision 2 promised "one block" for a visit its own §6.3 example spreads
across two operators' columns, which a column layout cannot draw.

Space inside availability is tappable; space outside is dimmed, tappable (§8.4),
and hatched **on today and future dates only** (§6.4). A closure day shows its
`reason`.

**Changing day is a horizontal swipe**, with a date strip for jumping. Above
three active operators the columns scroll horizontally and the swipe gives way to
the date strip.

A deactivated operator's column keeps rendering while she has appointments on
the day shown, so they stay reachable to move or cancel.

**Route:** navigation item *Agenda*.

### 9.2 Agenda — day list

Every appointment of the day in time order, operator on each. **Route:** a toggle
in the Agenda header, remembered per device (D13).

### 9.3 Agenda — week per operator

One operator, seven days. **Route:** the operator selector in the Agenda header —
not a column head, which does not exist in the list view.

### 9.4 Visit sheet

Opens over the calendar. Client, date, and one or more services each with
operator, time and duration. Add service, move, delete. **Route:** tapping a
block or an empty cell.

### 9.5 Finder

The screen behind the "+": service picker, then the paged results of §8.3, the
out-of-hours switch, and the reason-code empty state. Revision 2 described this
flow in its booking chapter and never gave it a screen — the flow that answers §1's second
question, absent from the screens chapter. **Route:** the floating "+".

### 9.6 Clients

Search matching name and phone, accent- and case-insensitive. The record shows
her details, upcoming and past visits, and a button to book from her, prefilled
with her last service, operator and duration — the three-week rebooking rhythm
without a recurrence engine.

**Edit** (including `preferred_operator_id` and the `no_messages` toggle),
**delete**, and **export this client's record** all live here (§11.3).

**Route:** navigation item *Clienti*.

### 9.7 Birthdays

Today, this week, this month, by the window rule of §6.2.1, excluding
`no_messages`. Each row offers **WhatsApp or a call**; a row without a phone
shows the name with no action. **Route:** a tab inside Clienti.

### 9.8 Availability

*Typical week*: per operator, seven days of ranges; add, drag, delete.
*Exceptions*: pick a date or a date range, then "assente", "questi orari
invece", or "torna all'orario abituale" (which deletes the exception day). A
childless exception day is labelled **assente**.

**The exception editor pre-fills with the day's currently resolved ranges.**
Without this, "replaces the whole day" is a trap: Vera works 9–13 and 15–19, must
leave at 17:00, enters 15:00–17:00, and silently loses her morning — with her
10:00 client left out-of-hours. Two reviewers found this independently.

Any narrowing runs §7.6 first. **Route:** navigation item *Disponibilità*.

### 9.9 Settings

Operators (add, link to an account, deactivate — which runs §7.6's conflict list
and is refused by the guard of §6.1 — colour, order), service
categories, services (name, duration, category, buffer, who performs them,
order, deactivate), salon hours, salon closures, export (§11.5), retention
review (§11.4).

**Linking an operator to an account** needs the Supabase user's id, and
`auth.users` is not readable by the application role. The accounts list is
therefore served by a `security definer` function owned by the migration role
that returns **only id and email** for existing users, callable only by an
active operator. Revision 3 described this screen while leaving it no way to
read the ids, which also removed the escape route D30 relies on.

**Route:** navigation item *Impostazioni*.

### 9.10 First run

With the operators seeded (D30) but no services and no availability, a guided
first run creates categories, then services, then who performs what, then each
typical week. Every screen has an empty state naming the next step.
**Route:** automatic when the catalogue is empty.

### 9.11 Navigation

Four items: **Agenda · Clienti · Disponibilità · Impostazioni**, with a badge on
Impostazioni when clients are eligible for deletion (§11.4) — a purge that lives
only inside a settings screen never happens. Birthdays is a tab within Clienti. A
floating "+" on the agenda opens the finder.

### 9.12 Visual identity (D31)

From the AVStyle brand:

| Token | Value | Use |
|---|---|---|
| Powder pink | `#FDEDF0` | Application background |
| Brand pink | `#F3A4BA` | The watercolour mark and large decorative fills only |
| Deep rose | `#C2185B` | Accents, selection, focus rings, anything with an edge to see |
| Ink | `#140D18` | Text, rules, the logo's line art |
| White | `#FFFFFF` | Cards, sheets |

The logo (`AV-style-logo.png`, 496×460, transparent) is black line art on a pink
watercolour stroke. It appears in the header and on the first-run screen, **never
behind the calendar**.

Typography: **Cinzel** and **Cinzel Decorative** carry the brand and are used for
the wordmark and screen titles only — they are display faces and unreadable at
agenda density. The calendar, sheets and lists use a neutral, wide sans at a
large size, with tabular figures so times align.

Brand pink on powder pink is **1.71:1** — below the 3:1 that WCAG 1.4.11 asks of
a user-interface component — so it cannot carry selection or any other boundary
the eye must find. Deep rose, a darker tone of the same hue and not taken from
the site, reaches **5.2:1** and does that work. Ink on powder pink is 16.8:1.

Operator colours are drawn from this family, must reach **3:1 against the
background**, and must remain distinguishable without relying on a red–green
difference. Light, not dark: the room is bright,
hands are busy, and legibility comes before atmosphere.

---

## 10. Error handling

### 10.1 Naming a conflict

Before saving, an advisory query — **excluding the appointments being written**,
exactly as §7.4 excludes them — builds the message from the **owning
appointment**, not the colliding cell: *"Annalisa ha un appuntamento alle 14:00
con Maria Rossi"*, with a button that navigates there. A 14:00–15:00 appointment
and a new 14:30 booking first collide at 14:30 — a time at which nothing starts.

**When the pre-check passes and the constraint fires anyway** — another operator
committed in between — the transactional function of §4.6 has already forced the
constraint to report inside the transaction, so the handler re-runs the lookup
and produces the same sentence. Revision 2 identified this gap and left it: the
operator would have seen a raw Postgres error on the one path where the salon
needs to know which client to ring.

Without that exclusion, moving an appointment from 10:00 to 10:30 finds its own
cells 126–131 still in place and reports *"Vera ha un appuntamento alle 10:00 con
Maria Rossi"* — naming the appointment being dragged as its own blocker.
Revision 3 fixed this inside the proposal function and left it standing here,
which is the path that actually produces the sentence — and the only check at
all on §8.1's tap-a-cell route, which never calls the proposal function.

When a move collides with several appointments, all are listed: the handler
re-runs the whole pre-check, since a unique violation reports one key only.

### 10.2 Two people editing at once

`visit` carries an `updated_at` of its own, because §6.3 moves a whole visit by
updating `visit_date` and that path would otherwise have no lost-update
protection at all; the cascade onto the appointments bumps theirs too, so a
sheet open on one of them still detects the change.

The check is a **compare-and-set in the `UPDATE`'s own `WHERE` clause** with an
affected-row count — not a read followed by a comparison in TypeScript, which is
the lost-update race this design rejects. `updated_at` is round-tripped verbatim
as received, because Postgres microseconds truncate through a JavaScript `Date`
and would produce phantom conflicts.

**Zero rows affected has three causes and three messages:**

1. The appointment changed — show what changed.
2. It was **deleted** while the sheet was open — unrecoverable under D15; say so
   and offer to re-create it from the sheet's contents.
3. **Your account was deactivated** while the sheet was open (§4.4). Revision 2
   declared its enumeration exhaustive and was made wrong by a correction in
   another section: it would have told an operator that a client's appointment
   had been deleted when it had not, and offered a re-creation that would fail in
   turn.

### 10.3 No connection

The app does not work offline (D22).

`navigator.onLine` reports the interface, not reachability, and salon wifi fails
exactly as a live association with a dead uplink — so the banner cannot be
immediate and revision 1 should not have promised it was. The mechanism is a
**heartbeat plus a request timeout**, and because the dangerous case is a request
that hangs rather than fails, **every save shows an explicit saved state** and the
sheet stays open until it arrives. Nobody should walk away from a spinner
believing a booking landed.

### 10.4 Deletion

One confirmation, then gone (§8.7). The only path with no way back.

---

## 11. Personal data

### 11.1 What is collected

Name, phone, birthday without the year, preferred operator, a message opt-out,
and the record of which services were received on which dates.

**No free-text field about a client or an appointment** (D26). The things
operators most need to jot down are *allergica al gel*, *incinta*, *attenzione
alla cera calda*; a "write nothing medical here" label would not have stopped
them, and removing the field removes the vector. (`salon_closure.reason` is free
text about the salon, not about a person.)

A privacy notice is displayed in the salon. So that it can actually be written,
the design records what it must contain: controller; purposes; **processors —
Supabase and Vercel, each requiring a data processing agreement and each
entailing a transfer**; the retention period (D21); and the rights of §11.3.
§8.2 carries the corresponding line at the point of collection.

### 11.2 The boundary with health data

What matters is what can be **inferred**, not what is labelled. A named
individual with a dated, recurring history of lymphatic drainage or reflexology
is a record from which health information may be inferable. **This document does
not assert the answer**; it is §14's first question. Revision 1 asserted it, and
drew the line around a note field that no longer exists.

### 11.3 Data subject requests

All three in §9.6:

- **Edit** her details.
- **Delete** her — cascading through visits, appointments and cells, defined by
  `on delete cascade` rather than failing on a foreign key.
- **Export her record** as a file, for access or portability. Revision 2 claimed
  it lived on the client record and it existed nowhere; the whole-dataset CSV of §11.5 is a
  different artefact and does not answer a subject request.

`no_messages` records an objection to the birthday greeting (§6.2).

### 11.4 Retention

A client with no visit — past or future — for **24 months**, measured by
`coalesce(last_activity_at, created_at::date)` **against a server-computed date**
(§5.1), becomes eligible. Settings lists who is about to be removed and a person
confirms; a badge in the navigation surfaces it (§9.11).

The period is **proposed**, not settled (§14).

### 11.5 Export and backup

A server action produces a CSV of clients and appointments and returns it to the
requester. It runs **behind both the session check and `app.is_active_operator()`**
(§4.4): a session check alone would let a just-deactivated operator export the
entire client list, which is the offboarding hole of revision 1 with the worst
possible payload. No public route handler; the `service_role` key never reaches
the browser; no public storage bucket.

**An export defeats retention**, and the design says so: a client purged at 24
months remains in every file taken before the purge. The notice states that
copies exist. Exports belong in the salon's password manager or a controlled
drive and **never in a WhatsApp chat**, which would re-disclose the whole dataset
to a third party. The app keeps no copy.

**Backup coverage on the Supabase plan in use must be measured before go-live,
not assumed** (§14).

---

## 12. Declared limits

1. No offline operation (§10.3).
2. No record of who created, changed or deleted anything. Three accounts (D11)
   make attribution possible to add later; D15 declines it for now.
3. A cancelled appointment leaves no trace. **History therefore shows what was
   booked and not cancelled** — not what was actually performed, since without
   statuses (D15) a kept appointment and a missed one are identical. Revision 2
   claimed the opposite and was contradicted by its own next limit.
4. No no-show tracking.
5. No prices (D14).
6. Shared physical resources are not modelled (D7). **The revisit trigger is not
   hiring**: contention between two operators over one cabin was already
   impossible. It is *any arrangement where a client occupies a room while the
   operator's hands are free*.
7. **Unattended treatment time is not sellable** (D24). Pressotherapy blocks the
   operator for its full duration even though she could be waxing someone else.
8. **Nothing that is not a client appointment can be entered** (D27). "Vera
   leaves at 16:00" is an availability exception.
9. No recurrence engine; §9.6's prefilled rebooking covers the common rhythm.
10. The per-device default operator (§4.5) is lost when browser storage is
    cleared, falling back to the account's own operator.

(Offboarding by deactivation is a capability, not a limit, and is described in
§4.4.)

---

## 13. Testing strategy

### 13.1 The proposal function

- A range ending exactly on its last boundary, and an appointment flush against
  either end
- **Two adjacent ranges that fold, where the candidate must be accepted** — the
  case revision 1 omitted while testing only its opposite, so the suite would
  have gone green on the defect of §7.2
- **Three touching ranges**, which a pairwise merge gets wrong and a fold gets
  right
- A real lunch break, where the straddling candidate is refused
- An exception that shortens the day; one that lengthens it; a childless
  exception day (away)
- A partial closure cutting a range in two
- Each `dayStatus` returning its own reason code, **including a partial closure
  that empties the day**, which must read as closed and not as full
- A service longer than any range
- A multi-service visit that fits only without the buffers
- **The preceding appointment's buffer** respected when nothing follows, **and
  the proposed service's own** respected when nothing precedes — one half failed
  under revision 2 and the other under revision 3
- `excludeAppointmentIds`: a one-cell move proposed, and a two-service visit
  moved as a unit — which a single id cannot express
- `nowCell`: today's past cells excluded, future days unfiltered
- Birthday windows: a week spanning two months, a week spanning 31 December, and
  a 29 February birthday appearing in both the week and the month view of a
  non-leap year

### 13.2 Database safeguards

**Fixtures contain at least two operators, two dates, two clients and two
services**, so the scoping predicates are exercised rather than merely declared.

- Overlapping appointments for one operator on one date: rejected
- The same cells for another operator, and on another date: accepted
- **A swap between two operators through the transactional function: accepted**;
  and the same swap as two separate calls: **rejected** — the case revision 2's
  test asserted inside one SQL transaction, which no production path could reach
- **Moving a two-service visit through the function: accepted**
- The trigger keeps cells aligned when an appointment is shortened, lengthened,
  moved in time, moved to another date and **reassigned to another operator**
- **An appointment moved by less than its own duration**
- Direct `INSERT`/`UPDATE`/`DELETE` on `appointment_slot` as the application
  role: **denied**; and **`SELECT` on it: permitted** — revision 2's revocation
  removed the read its own availability query needs, and its test checked only
  the three write verbs
- The composite foreign keys: an appointment's date cannot diverge from its
  visit's; a cell's operator or date cannot diverge from its appointment's
- **Deleting a client with visits, appointments and cells succeeds in one
  statement** — the case revision 3's missing `on delete cascade` turned into a
  foreign-key error, taking the right of erasure with it
- **Reassigning an appointment to another operator succeeds**, which fails if the
  trigger's delete predicate matches on the cascaded columns
- `cell_count > 0` and `operator_service.duration_cells > 0` enforced
- An exception day and its ranges are written atomically; a failure after the
  first write leaves neither
- A partial closure spanning several dates cuts the window out of each
- Deleting the last appointment of a visit removes the visit, **including when
  the two deletions run in overlapping transactions** — written as two genuinely
  concurrent sessions, since run in sequence it passes over the defect
- **Two operators deactivating each other concurrently cannot leave the salon
  with no active linked operator**, and unlinking the last `auth_user_id` is
  refused by the same guard
- `start_cell + cell_count <= 288` enforced
- Overlap rejected on `weekly_availability` and on `exception_range`;
  `end_boundary <= 288` on both
- `salon_closure`: one boundary set without the other, and an inverted window —
  both rejected. **A partial closure spanning several dates is accepted**, and
  its window is cut out of each date: revision 4 listed it here as something to
  reject while §6.5 built it deliberately, and §6.5 is the side that is right
- The birthday pair: both-or-neither; 29 February accepted; 31 February and
  31 April **rejected without raising**
- `last_activity_at` after an appointment insert, move and delete, **after a
  visit's date changes**, and for a client with only a future visit
- Retention eligibility for a client with a null `last_activity_at`
- The last active operator cannot be deactivated

### 13.3 Access control — all directions

- An **unauthenticated** session reads nothing
- **A session authenticated as another Supabase user** reads nothing — the
  direction revision 1 omitted, which is the one the hole of §4.3 opened
- A **deactivated** operator reads nothing, **and the export server action
  refuses her** — not only her queries
- The policy on `operator` itself does not recurse
- **Every table in `public` has row-level security enabled** — enumerated from
  the catalogue, not listed by hand, since a policy on a table without it is
  inert and reopens the original hole in silence
- The revocation on `appointment_slot` survives a fresh migration run

### 13.4 End-to-end

1. Book from the calendar
2. Book a two-service visit from the finder
3. Move an appointment; move a two-service visit
4. Delete an appointment
5. A double booking is refused with the correct message, and **moving an
   appointment within its own duration is not reported as a conflict with
   itself**
6. Enter an exception narrowing a day that holds bookings, and see the conflict
   list
7. Book outside availability by tapping a dimmed cell, and see the warning
8. First run on an empty catalogue

---

## 14. Open questions

**Blocking for go-live — for the privacy adviser:**

1. Is the record of services received — a named client with dated, recurring
   aesthetic treatments — special-category data?
2. What is the legal basis for the appointment record, and separately for the
   birthday greeting? The birth date is collected solely for the greeting, so if
   that purpose lacks a basis the field lacks one. A consent requirement attaches
   to the communication, not to the tooling, so sending it by hand does not
   avoid it.
3. Is 24 months the right retention period (D21)?
4. Does a notice displayed in the salon satisfy the information obligation, given
   that most clients are recorded over the phone?

**Blocking for go-live — to be measured, not assumed:**

5. What backup coverage does the Supabase plan in use actually provide, and does
   a project on that plan pause during a two-week August closure? Revision 1
   asserted both without verification.

**Not blocking:**

6. Whether a second aesthetician is expected, which reopens D7 — though the
   corrected trigger in §12.6 may already apply today.

---

## 15. Where the review loop stops

Three rounds of adversarial review each found real defects, and each round found
most of them **in the corrections written for the round before**. That pattern is
worth naming rather than repeating.

The rounds have not been equally productive by subject:

- **Design decisions have converged.** The time model, the visit, the
  availability model, the client record, the scope boundaries and the privacy
  position have taken no substantive hits since round one. Round three raised
  none.
- **Database detail has not, and will not by reading.** Round three's findings
  are foreign-key actions, trigger firing order, trigger names, lock acquisition,
  schema creation and grants. Every one is real; not one can be *settled* on
  paper. A fourth round would produce a fourth list of the same kind.

So this document stops here, and the remaining risk moves to where it can be
discharged: **the implementation plan writes the migrations, and the tests of
§13.2 and §13.3 run them.** A composite key without `on delete cascade` is found
in half a second by the deletion test; it took a reviewer twenty minutes and
would have survived another careful reading.

The DDL in §6 is therefore **normative in intent and indicative in syntax**. Where
a statement here and a passing test disagree, the test wins and this document is
corrected — and the first plan step is to stand the schema up and run §13.2 and
§13.3 against it, before a line of application code exists.
