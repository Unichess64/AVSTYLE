-- supabase/migrations/0019_annunci.sql
--
-- L'agenda si aggiorna da sola (design 3a D3-12, D3-16, §4.6), ma con una
-- TABELLA NOSTRA invece del canale privato di Supabase.
--
-- Perché: `realtime.messages` appartiene a `supabase_realtime_admin`, e il ruolo
-- delle migrazioni non ne è membro né è superutente — la politica su quel canale
-- non è creabile, né da qui né a mano dall'editor SQL, che usa lo stesso ruolo
-- (misurato tre volte). La pubblicazione `supabase_realtime`, invece, appartiene
-- a `postgres`: una tabella nostra dentro quella pubblicazione si fa tutta da
-- qui. Decisione dell'utente del 23 settembre 2026.
--
-- SOLO INSERIMENTI: con postgres_changes le politiche non si applicano agli
-- eventi DELETE, e per gli UPDATE il vecchio stato porta solo la chiave
-- primaria. Qui ogni riga è già la notizia completa, la pubblicazione è
-- limitata agli INSERT, e la pulizia non si ascolta.
--
-- Il contenuto è solo un elenco di DATE: nessun nome, nessun telefono, nessun
-- id di cliente.

create table annuncio (
  id     bigint generated always as identity primary key,
  giorni date[] not null,
  creato timestamptz not null default clock_timestamp(),

  constraint annuncio_giorni_non_vuoto check (cardinality(giorni) > 0)
);

create index annuncio_per_eta on annuncio (creato);

alter table annuncio enable row level security;

create policy annuncio_lettura on annuncio
  for select using ((select app.is_active_operator()));

revoke all on table annuncio from public, anon, authenticated;
-- ⚠︎ La SELECT va anche ad `anon`, e NON è una svista: è ciò che chiude la
-- fuga, non ciò che la apre. Misurato il 28/09/2026 su banco usa-e-getta, con
-- un client che porta la sola chiave pubblica e nessun token di operatrice:
--
--   senza `grant select … to anon` → UN messaggio per ogni INSERT, con
--     `new: {}`, `old: {}` e `errors: ["Error 401: Unauthorized"]`
--   con il grant                   → ZERO messaggi
--
-- Realtime consegna il guscio vuoto a chi non ha NESSUN privilegio di colonna
-- sulla tabella; a chi ne ha uno applica invece la politica per riga e sopprime
-- il messaggio. I giorni non trapelano in nessuno dei due casi, ma senza il
-- grant trapela il FATTO che il salone ha appena scritto in agenda, e a che
-- ritmo — a chiunque, perché la chiave pubblica sta nel bundle dell'app. È la
-- ragione per cui l'estranea e l'operatrice disattivata delle altre due prove
-- negative non ricevono niente: loro il grant ce l'hanno, e la RLS li filtra.
--
-- Il permesso di TABELLA non concede nessuna riga: `annuncio_lettura` è la sola
-- politica, e `anon` non la supera mai. È la forma di `00051_privilege_baseline`
-- per tutte le altre tabelle; `0013` l'aveva stretta per `invio` e
-- `visita_cancellata`, dove nessuna prova legge da `anon`. Qui una prova ci
-- legge, ed è il canale. ⚠︎ L'audit del Task 9 codifichi DUE forme, non una.
grant select on table annuncio to anon, authenticated;

-- Solo gli INSERT viaggiano: nessun evento di cancellazione, che sfuggirebbe
-- alle politiche.
alter publication supabase_realtime add table annuncio;

-- ⚠︎ `publish` è un parametro della PUBBLICAZIONE, non della tabella: ogni
-- tabella che qualcuno aggiungesse dopo — anche con l'interruttore «Realtime»
-- di Supabase Studio, che scrive in questa stessa pubblicazione — perderebbe
-- update e delete in silenzio. Oggi la pubblicazione è vuota (misurato), e il
-- 3a-1 è l'unico a usarla; se un giorno servisse un'altra tabella in diretta,
-- questa riga va ridiscussa.
alter publication supabase_realtime set (publish = 'insert');

-- Un trigger PER ISTRUZIONE per tabella e per evento: raccoglie i giorni
-- toccati, vecchi e nuovi, e lascia UNA riga. Un trigger per riga lascerebbe
-- un annuncio per appuntamento.
--
-- security definer, proprietaria postgres: la tabella non è scrivibile da
-- `authenticated`, ed è la ragione per cui nessun telefono può fabbricare
-- annunci.
create function app.annuncia_giorni() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_giorni date[];
begin
  if tg_table_name = 'appointment' then
    if tg_op = 'INSERT' then
      select array_agg(distinct n.appointment_date) into v_giorni from nuove n;
    elsif tg_op = 'DELETE' then
      select array_agg(distinct v.appointment_date) into v_giorni from vecchie v;
    else
      select array_agg(distinct g) into v_giorni
      from (select n.appointment_date as g from nuove n
            union
            select v.appointment_date from vecchie v) s;
    end if;
  else
    if tg_op = 'INSERT' then
      select array_agg(distinct n.visit_date) into v_giorni from nuove n;
    elsif tg_op = 'DELETE' then
      select array_agg(distinct v.visit_date) into v_giorni from vecchie v;
    else
      select array_agg(distinct g) into v_giorni
      from (select n.visit_date as g from nuove n
            union
            select v.visit_date from vecchie v) s;
    end if;
  end if;

  if v_giorni is null or cardinality(v_giorni) = 0 then
    return null;
  end if;

  insert into public.annuncio (giorni) values (v_giorni);

  -- Nessuna pulizia qui dentro: questo trigger gira UNA VOLTA PER ISTRUZIONE,
  -- cioè da 2 a 5 volte per salvataggio, e di più al crescere degli appuntamenti
  -- (misurato: 2 in creazione con un appuntamento, 3 con due, 4 passando da due
  -- a uno, 5 passando da uno a tre). La pulizia va fatta UNA VOLTA PER INVIO, e
  -- la fa `app.chiudi_invio`, che ha già le sue due delete a lotti
  -- (Task 1): aggiungi lì la terza riga per `public.annuncio`, con la stessa
  -- forma e un'ora di conservazione.
  -- ⚠︎ Non è per uscire dal blocco sulla visita: `chiudi_invio` gira nella
  -- stessa transazione di `salva_visita`, e il blocco è ancora tenuto quando la
  -- delete parte (misurato al quinto giro).
  return null;
end
$$;

create trigger zz_annuncia_appuntamenti_ins
after insert on appointment
referencing new table as nuove
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_appuntamenti_upd
after update on appointment
referencing new table as nuove old table as vecchie
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_appuntamenti_del
after delete on appointment
referencing old table as vecchie
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_visite_ins
after insert on visit
referencing new table as nuove
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_visite_upd
after update on visit
referencing new table as nuove old table as vecchie
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_visite_del
after delete on visit
referencing old table as vecchie
for each statement execute function app.annuncia_giorni();

revoke execute on function app.annuncia_giorni() from public, anon;

-- ---------------------------------------------------------------------------
-- La pulizia degli annunci, che vive in `app.chiudi_invio` (Task 1, 0013).
--
-- ⚠︎ RISCRITTA PER ESTESO, e non con il solo frammento della `delete`: il
-- commento di `0013:186-190` avverte che `create or replace function` AZZERA
-- ogni attributo non ripetuto, e nomina questo task. Ripetere solo il corpo
-- toglierebbe a `chiudi_invio` `security definer` e `search_path = ''`, e la
-- funzione è chiamata da dentro `salva_visita`, `sposta_visita_a`,
-- `cancella_visita` e `app.apri_invio_come_annullato`, che sono `security
-- invoker`: ad `authenticated` `0013` lascia su `invio` la sola SELECT, quindi
-- OGNI scrittura di visita fallirebbe con `42501`. Il corpo qui sotto è quello
-- di `0013:130-177`, invariato tranne le tre righe commentate che diventano la
-- terza pulizia.
--
-- Gli annunci servono per pochi secondi: un'ora è già larga. La pulizia sta qui
-- e non nel trigger perché il trigger gira UNA VOLTA PER ISTRUZIONE, da 2 a 5
-- volte per salvataggio, mentre `chiudi_invio` gira una volta per INVIO.
create or replace function app.chiudi_invio(p_codice uuid, p_esito text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_toccate integer;
begin
  update public.invio
     set esito = p_esito, aggiornato = clock_timestamp()
   where codice = p_codice and esito = 'in_corso';
  get diagnostics v_toccate = row_count;
  if v_toccate <> 1 then
    raise exception 'invio % non era aperto', p_codice using errcode = 'P0003';
  end if;

  delete from public.invio
   where codice in (
     select i.codice from public.invio i
      where i.aggiornato < now() - interval '30 days'
      limit 100
   );
  delete from public.visita_cancellata
   where id in (
     select v.id from public.visita_cancellata v
      where v.cancellata_il < now() - interval '30 days'
      limit 100
   );
  delete from public.annuncio a
   where a.id in (select b.id from public.annuncio b
                   where b.creato < now() - interval '1 hour' limit 100);
end
$$;
