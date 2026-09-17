# AVStyle Salon Scheduler

Internal appointment book for AVStyle — Beauty Specialist, Perugia.

- Design specification: [`docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`](docs/superpowers/specs/2026-09-17-salon-scheduler-design.md)
- Brand assets: [`docs/brand/`](docs/brand/)

Status: specification only. No implementation yet.

## Operator accounts

Three accounts with identical permissions, one per operator (spec §4.2). Self-service
signup, anonymous sign-in and OAuth providers are disabled; the accounts are created
from the Supabase dashboard.

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
