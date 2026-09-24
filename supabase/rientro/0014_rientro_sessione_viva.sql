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

-- E, se anche i trigger di chiusura sessioni falliscono per lo stesso motivo.
-- Sono TRE, non uno: un solo trigger con una clausola `when` su OLD e NEW non
-- si può dichiarare insieme per INSERT, UPDATE e DELETE (design 3a §4.7), e il
-- Task 4 li crea separati. Un rientro che ne nominasse uno solo, o che usasse
-- il nome al singolare, solleverebbe `42704 trigger does not exist` e
-- lascerebbe vivi tutti e tre — cioè lascerebbe `update operator` impossibile
-- proprio mentre la procedura «telefono perso» di §4.7 chiede di riattivare le
-- colleghe (passi 3 e 4). La spec pretende che il rientro neutralizzi anche i
-- trigger: finché queste righe restano commentate, il reperto S4-4 è APERTO.
-- Le righe sono commentate perché il Task 4 non ha ancora creato i trigger:
-- oggi scommetterle darebbe 42704. Si scommentano insieme al Task 4.
-- alter table public.operator disable trigger zz_chiudi_sessioni_ins;
-- alter table public.operator disable trigger zz_chiudi_sessioni_upd;
-- alter table public.operator disable trigger zz_chiudi_sessioni_del;
