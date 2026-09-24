-- supabase/migrations/0014_sessione_viva.sql
--
-- Chiusura immediata, design 3a D3-17 e §4.7.
--
-- Fino a qui `app.is_active_operator()` guardava solo la riga in `operator`.
-- Chiudere le sessioni di un account (0015) spegne i token di AGGIORNAMENTO,
-- ma il token di ACCESSO già emesso resta valido fino alla scadenza —
-- `jwt_expiry = 3600`, quindi fino a un'ora. In quell'ora, chi ha in mano un
-- telefono perso legge tutte le clienti e scrive. Chiedere che la SESSIONE del
-- token esista ancora chiude la finestra: PostgREST verifica la firma, la
-- sicurezza per riga verifica che la sessione ci sia.
--
-- `auth.sessions` è una tabella interna di Supabase. La lettura regge perché
-- il proprietario di questa funzione ha SELECT e `bypassrls`. Se una versione
-- futura glieli togliesse, ogni richiesta fallirebbe: un guasto RUMOROSO, che
-- non espone dati. La prova di catalogo di `catalogue-audit` lo sorveglia, e
-- `supabase/rientro/0014_rientro_sessione_viva.sql` (fuori da `migrations/`)
-- toglie questa clausola se serve.
--
-- Il claim `session_id` c'è sempre nei token di GoTrue; `anon` e `service_role`
-- non ce l'hanno, e `nullif(...)::uuid` dà NULL, quindi l'`exists` è falso:
-- la funzione non va mai in errore.
create or replace function app.is_active_operator() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator o
    where o.auth_user_id = auth.uid()
      and o.is_active
  )
  and exists (
    select 1
    from auth.sessions s
    -- Il nullif sta PRIMA del cast, come in auth.uid(): una GUC impostata
    -- almeno una volta con set_config(..., true) non torna a NULL, torna a ''
    -- — e ''::jsonb solleva 22P02 DENTRO ogni politica, anche quando il primo
    -- exists è già falso (misurato su banco separato).
    where s.id = nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
  )
$$;

-- Le politiche esistenti chiamano la funzione NUDA: `using app.is_active_operator()`.
-- Una funzione security definer non viene mai messa in linea, quindi senza il
-- `select` la funzione — e ora la ricerca in auth.sessions — gira A OGNI RIGA.
-- Si riscrivono tutte, comprese le due del piano 3a-1.
drop policy operator_access on operator;
create policy operator_access on operator
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy service_category_access on service_category;
create policy service_category_access on service_category
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy service_access on service;
create policy service_access on service
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy operator_service_access on operator_service;
create policy operator_service_access on operator_service
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy salon_settings_access on salon_settings;
create policy salon_settings_access on salon_settings
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy client_access on client;
create policy client_access on client
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy visit_access on visit;
create policy visit_access on visit
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy appointment_access on appointment;
create policy appointment_access on appointment
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy appointment_slot_read on appointment_slot;
create policy appointment_slot_read on appointment_slot
  for select using ((select app.is_active_operator()));

drop policy weekly_availability_access on weekly_availability;
create policy weekly_availability_access on weekly_availability
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy exception_day_access on exception_day;
create policy exception_day_access on exception_day
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy exception_range_access on exception_range;
create policy exception_range_access on exception_range
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy salon_closure_access on salon_closure;
create policy salon_closure_access on salon_closure
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy invio_lettura on invio;
create policy invio_lettura on invio
  for select using ((select app.is_active_operator()));

drop policy visita_cancellata_lettura on visita_cancellata;
create policy visita_cancellata_lettura on visita_cancellata
  for select using ((select app.is_active_operator()));
