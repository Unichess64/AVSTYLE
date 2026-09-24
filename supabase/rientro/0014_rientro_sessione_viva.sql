-- supabase/rientro/0014_rientro_sessione_viva.sql
--
-- NON è una migrazione: sta fuori da supabase/migrations/ apposta, perché
-- `db reset` e `db push` la applicherebbero da sole.
--
-- Si esegue a mano, dall'editor SQL, SOLO se Supabase toglie al proprietario
-- il diritto di leggere auth.sessions e il salone resta chiuso fuori.
-- Riapre la finestra fino a un'ora fra la chiusura di una sessione e la
-- scadenza del token (design 3a §4.7, reperto B7), e va insieme alla
-- disattivazione dell'operatrice, che resta l'unica difesa.
create or replace function app.is_active_operator() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.operator o
    where o.auth_user_id = auth.uid() and o.is_active
  )
$$;

-- E, se anche il trigger di chiusura sessioni fallisce per lo stesso motivo:
-- alter table public.operator disable trigger zz_chiudi_sessioni;
