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
-- Sono TRE perché il Task 4 li ha creati separati, uno per evento. ⚠︎ NON
-- perché fossero necessari: la versione del 24/09/2026 diceva «un solo trigger
-- con una clausola `when` su OLD e NEW non si può dichiarare insieme per
-- INSERT, UPDATE e DELETE», ma in `0015` una clausola `when` non c'è — il
-- confronto sta nel corpo — e la revisione ha misurato che un trigger solo
-- lascia la suite verde. Qui la forma a tre va comunque onorata alla lettera:
-- un rientro che ne nominasse uno solo, o che usasse il nome al singolare,
-- solleverebbe `42704 trigger does not exist` e lascerebbe vivi tutti e tre — cioè lascerebbe `update operator` impossibile
-- proprio mentre la procedura «telefono perso» di §4.7 chiede di riattivare le
-- colleghe (passi 3 e 4). La spec pretende che il rientro neutralizzi anche i
-- trigger, e con queste tre righe VIVE il reperto S4-4 è CHIUSO: restavano
-- commentate solo perché il Task 4 non aveva ancora creato i trigger, e
-- scommentarle prima avrebbe dato 42704.
--
-- Verificate a mano il 24/09/2026, dopo un `db reset`, eseguendole una per una
-- da uno script Node con `pg` (mai `psql`): tutte e tre rispondono ALTER TABLE
-- e `pg_trigger.tgenabled` per i tre nomi passa da 'O' a 'D'. È l'unico modo di
-- sapere che i nomi combaciano davvero: un nome sbagliato dà 42704 e lascia
-- vivo il trigger, cioè lascia `update operator` impossibile proprio mentre la
-- procedura «telefono perso» di §4.7 chiede di riattivare le colleghe.
alter table public.operator disable trigger zz_chiudi_sessioni_ins;
alter table public.operator disable trigger zz_chiudi_sessioni_upd;
alter table public.operator disable trigger zz_chiudi_sessioni_del;
