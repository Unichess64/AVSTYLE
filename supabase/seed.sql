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
