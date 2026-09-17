# AVStyle Salon Scheduler

Internal appointment book for AVStyle — Beauty Specialist, Perugia.

- Design specification: [`docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`](docs/superpowers/specs/2026-09-17-salon-scheduler-design.md)
- Brand assets: [`docs/brand/`](docs/brand/)

Status: database foundations under implementation on the `foundations` branch. The application does not exist yet.

## Operator accounts

Three accounts with identical permissions, one per operator (spec §4.2). The accounts are
created from the Supabase dashboard.

Self-service signup, anonymous sign-in and OAuth providers **must be disabled** — spec §4.2.
This is configuration, not schema: it is applied in `supabase/config.toml` for local
development and in the project's Auth settings for the hosted project, and is asserted by
the configuration test in the foundations plan.

The three `operator` rows are created by a seed migration (spec D30). Linking each row
to its Supabase account is a one-off statement, run once in the SQL editor after the
accounts exist:

```sql
update operator set auth_user_id = '<uuid from auth.users>' where name = 'Vera';
update operator set auth_user_id = '<uuid from auth.users>' where name = 'Annalisa';
update operator set auth_user_id = '<uuid from auth.users>' where name = 'Alessandra';
```

Until a row is linked, that operator cannot sign in. Operators added later are linked
from Settings by an operator who is already active (spec §9.9).

**Warning: deleting an account from the Supabase dashboard while it is the last
linked, active operator locks the salon out.** The database refuses to let the
*last* active operator be deactivated, unlinked, or relinked to a non-existent
account (spec §6.1) — but that guard only fires on writes to the `operator`
table, and it cannot see a Supabase Auth account deleted directly from the
dashboard's Authentication panel (spec §12, item 12).

Corrected at the residual round: this section used to say that, once that
account is deleted, nobody — including any operator — can fix it from inside
the app, and that the recovery is out-of-band. Measured false:
`app.is_active_operator()` checks only `operator.is_active` and
`operator.auth_user_id` against the current session's claims, and never
consults `auth.users`, so a session that already holds a still-valid access
token for the deleted account keeps passing it.
**The lockout bites at the NEXT sign-in, not immediately** —
Supabase Auth simply refuses to mint a fresh token for a deleted account.
Until every still-valid session for that operator has expired, the recovery
is IN-band: any operator with a still-valid session can reactivate or relink
another operator from Settings, the same as any other roster edit. Only once
no such session remains does the recovery become out-of-band: from the
Supabase dashboard, create or restore a Supabase account and set
`operator.auth_user_id` to its id directly in the SQL editor, exactly as in
the linking step above.
