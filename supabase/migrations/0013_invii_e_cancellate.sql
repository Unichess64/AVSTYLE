-- supabase/migrations/0013_invii_e_cancellate.sql
--
-- Le due tabelle di servizio del percorso di scrittura, design 3a §4.4.
--
-- invio: un codice per ogni invio dell'operatrice — «Salva», «Elimina»,
-- rilascio di un trascinamento, «Annulla». Serve a una cosa sola: rendere VERA
-- la risposta di «Controlla». Misurato al sesto giro di revisione su un
-- database di prova: se la funzione di scrittura registra il codice come PRIMA
-- istruzione, «Controlla» che arriva dopo ASPETTA sulla chiave primaria fino
-- alla fine del commit — parte differita compresa — e vede l'esito vero;
-- se «Controlla» arriva prima, l'invio tardivo trova il codice 'annullato' e
-- non scrive. Senza questo, «Non risulta salvata» è una frase che il database
-- può smentire un attimo dopo.
--
-- visita_cancellata: i soli id delle visite cancellate. Distingue «cancellata
-- da un'altra parte» (D3-18) da «non è mai arrivata». Dato PSEUDONIMO e non
-- anonimo — un id si ricollega a una persona nel database —, senza nomi né
-- telefoni.
--
-- Nessuna delle due si scrive da PostgREST: ad `authenticated` resta la sola
-- SELECT, e le scritture passano dalle funzioni `security definer` qui sotto.
-- Lo schema `app` non è esposto da PostgREST (`supabase/config.toml`,
-- `schemas = ["public", "graphql_public"]`), quindi quelle funzioni non sono
-- raggiungibili DA PostgREST. Non dire «solo dall'interno di altre funzioni»:
-- è falso, e misurato falso — `authenticated` ha EXECUTE su `apri_invio` e
-- `chiudi_invio`, e una sessione che arrivasse allo schema `app` per altra
-- via aprirebbe e brucerebbe codici, `security definer` scavalcando la
-- sicurezza per riga. Il presidio vero è quella riga di `config.toml`, che
-- oggi NESSUNA prova pianta: se qualcuno vi aggiunge `"app"`, qui non si
-- rompe niente. La frase forte diventerebbe vera solo aggiungendo
-- `app.is_active_operator()` in testa alle due funzioni.

create table invio (
  codice     uuid primary key,
  esito      text not null,
  aggiornato timestamptz not null default clock_timestamp(),

  constraint invio_esito_noto check (esito in (
    'in_corso', 'annullato', 'salvata', 'cancellata', 'gia_cancellata',
    'esiste_gia', 'modificata_altrove', 'cancellata_altrove', 'non_trovata'
  ))
);

create index invio_per_eta on invio (aggiornato);

create table visita_cancellata (
  id            uuid primary key,
  cancellata_il timestamptz not null default clock_timestamp()
);

create index visita_cancellata_per_eta on visita_cancellata (cancellata_il);

alter table invio enable row level security;
alter table visita_cancellata enable row level security;

create policy invio_lettura on invio
  for select using ((select app.is_active_operator()));
create policy visita_cancellata_lettura on visita_cancellata
  for select using ((select app.is_active_operator()));

-- La regola predefinita dei permessi di Supabase concede TUTTO ad anon e ad
-- authenticated su ogni tabella nuova di public, TRUNCATE e MAINTAIN compresi.
--
-- Ad anon si toglie anche la SELECT, DIVERSAMENTE da `00051_privilege_baseline`,
-- che per le altre tabelle la tiene apposta perché diverse prove vi asseriscono
-- «zero righe» e non `42501`. Qui nessuna prova legge queste due tabelle da
-- anon, quindi la forma più stretta non costa niente — ma l'audit del Task 9
-- dovrà codificare due forme di permessi, non una.
revoke all on table invio, visita_cancellata from public, anon, authenticated;
grant select on table invio, visita_cancellata to authenticated;

-- La versione di una riga viaggia come TESTO, in UTC e con i microsecondi:
-- un `timestamptz` che passa da un `Date` di JavaScript perde i microsecondi e
-- ogni salvataggio diventerebbe un falso «modificata altrove» (spec §10.2).
--
-- `immutable` è più forte del vero: `to_char(timestamp, text)` è `stable`
-- (misurato nel catalogo, `provolatile = 's'`), e PostgreSQL non lo controlla.
-- Regge perché questa maschera è tutta numerica — nessun campo dipende da
-- `lc_time`, e `at time zone 'UTC'` toglie di mezzo il fuso della sessione:
-- misurato invariante anche con `DateStyle` German/SQL/Postgres. Chi cambia la
-- maschera perde quella garanzia in silenzio; e l'etichetta rende la funzione
-- eleggibile per un indice su espressione, dove il silenzio diventa un dato
-- sbagliato. Nessuno qui ha bisogno di `immutable`: se la maschera cambia,
-- degradarla a `stable`.
create function app.versione(p_quando timestamptz) returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select to_char(p_quando at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
$$;

-- Restituisce NULL se il codice è nuovo (e lo apre come 'in_corso'), oppure
-- l'esito già registrato. `on conflict do nothing` e non un blocco `exception`:
-- misurato che un sottoblocco che cattura la chiave duplicata lascia in piedi
-- le scritture fatte prima, e in `repeatable read` fa scrivere una funzione che
-- credeva di essersi fermata.
create function app.apri_invio(p_codice uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserite integer;
  v_esito    text;
begin
  insert into public.invio (codice, esito) values (p_codice, 'in_corso')
  on conflict (codice) do nothing;
  get diagnostics v_inserite = row_count;
  if v_inserite = 1 then
    return null;
  end if;

  select i.esito into v_esito from public.invio i where i.codice = p_codice;
  if v_esito is null then
    raise exception 'invio % sparito fra inserimento e lettura', p_codice
      using errcode = 'P0003';
  end if;
  return v_esito;
end
$$;

-- Chiude il codice con l'esito, e ne approfitta per la pulizia: 30 giorni, un
-- lotto per volta, senza lavoro pianificato da mantenere.
create function app.chiudi_invio(p_codice uuid, p_esito text) returns void
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

  -- ⚠︎ Le due misure citate qui sotto — il conteggio del trigger e il 55P03 —
  -- vengono da giri di revisione del PIANO e NON sono rifacibili a questo
  -- commit: né `public.annuncio` né `public.salva_visita` esistono ancora
  -- (Task 8 e Task 5). Si rimisurano lì, non si danno per acquisite. Per la
  -- scelta di sede non cambia nulla — 1 resta meno di 2 comunque.
  --
  -- Gli annunci servono per pochi secondi: un'ora è già larga. Sta qui e non
  -- nel loro trigger perché il trigger gira UNA VOLTA PER ISTRUZIONE, cioè
  -- da 2 a 5 volte per salvataggio, e di più al crescere degli appuntamenti
  -- (misurato: 2 in creazione con un appuntamento, 3 con due, 4 passando da due
  -- a uno, 5 passando da uno a tre), mentre qui gira UNA VOLTA PER INVIO
  -- (misurato 1 su sei forme: creazione, modifica e cancellazione).
  -- ⚠︎ NON serve a uscire dalla transazione che tiene il blocco sulla visita:
  -- `chiudi_invio` è chiamata da dentro `salva_visita`, e quando la delete
  -- parte il blocco è ancora tenuto (misurato al quinto giro, con 55P03 da una
  -- seconda connessione). Chi volesse davvero uscire dal blocco deve cambiare
  -- sede, non spostarla qui.
  -- La tabella nasce nel Task 8: fino ad allora la riga non esiste, e il Task 8
  -- la aggiunge con `create or replace function`.
  -- delete from public.annuncio a
  --  where a.id in (select b.id from public.annuncio b
  --                  where b.creato < now() - interval '1 hour' limit 100);
end
$$;

-- Ogni strada che cancella una visita passa di qui: la cancellazione diretta,
-- la visita rimasta orfana (zz_delete_orphan_visit, 0008) e la cascata dalla
-- cliente (0004). Per questo il trigger sta su `visit` e non nelle funzioni.
--
-- `security definer` NON è decorativo: un'operatrice può cancellare una visita
-- (politica `for all` su `visit`, 0004) ma su `visita_cancellata` ha la sola
-- SELECT. Senza i poteri del proprietario ogni cancellazione fatta dall'app
-- fallirebbe con `42501 permission denied`. ⚠︎ `create or replace function`
-- AZZERA ogni attributo non ripetuto: chi riscrive questa funzione — il Task 8
-- lo fa su `chiudi_invio` — ripete `security definer` e `set search_path = ''`
-- per esteso. La prova che se ne accorge è quella che cancella da
-- `asOperator`, non da `asOwner`.
create function app.registra_visita_cancellata() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.visita_cancellata (id) values (old.id)
  on conflict (id) do update set cancellata_il = clock_timestamp();
  return null;
end
$$;

-- AFTER è obbligatorio, non stilistico: questa funzione finisce con
-- `return null`, e in un trigger BEFORE ... FOR EACH ROW `return null` ANNULLA
-- l'operazione. Con BEFORE nessuna visita verrebbe più cancellata — si
-- fermerebbero la pulizia delle orfane di 0008, la cascata dalla cliente di
-- 0004 e domani «Elimina visita» — e la riga finirebbe comunque fra le
-- cancellate. Misurato su un banco usa-e-getta: `rowCount = 0`, la riga
-- sopravvive.
create trigger zz_registra_visita_cancellata
after delete on visit
for each row execute function app.registra_visita_cancellata();

revoke execute on function
  app.versione(timestamptz),
  app.apri_invio(uuid),
  app.chiudi_invio(uuid, text),
  app.registra_visita_cancellata()
from public, anon;

grant execute on function
  app.versione(timestamptz),
  app.apri_invio(uuid),
  app.chiudi_invio(uuid, text)
to authenticated;
