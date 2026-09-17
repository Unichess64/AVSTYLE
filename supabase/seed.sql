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

-- Resolve each operator's auth_user_id from auth.users by email, rather than
-- writing a hard-coded id, and refuse to overwrite one that is already set
-- to a DIFFERENT id. `[db.seed]` is enabled, so `supabase db reset --linked`
-- runs this file against the hosted project too: an unconditional update
-- would repoint the three real operator rows at these local-only ids, and
-- because every write to `operator` passes through is_active_operator()
-- (which checks auth_user_id against auth.uid()), that would lock every
-- real account out with no way to undo it from the application.
update operator o set auth_user_id = u.id
from auth.users u
where u.email = 'vera@example.test' and o.name = 'Vera'
  and (o.auth_user_id is null or o.auth_user_id = u.id);

update operator o set auth_user_id = u.id
from auth.users u
where u.email = 'annalisa@example.test' and o.name = 'Annalisa'
  and (o.auth_user_id is null or o.auth_user_id = u.id);

update operator o set auth_user_id = u.id
from auth.users u
where u.email = 'alessandra@example.test' and o.name = 'Alessandra'
  and (o.auth_user_id is null or o.auth_user_id = u.id);
