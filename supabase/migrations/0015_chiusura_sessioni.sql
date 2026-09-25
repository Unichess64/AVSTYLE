-- supabase/migrations/0015_chiusura_sessioni.sql
--
-- Le sessioni si chiudono da sole, design 3a D3-14 e §4.7.
--
-- Cinque casi, e ognuno è una strada per cui un telefono perso tornerebbe a
-- leggere le clienti: disattivazione; RIATTIVAZIONE (uccide le sessioni nate
-- mentre l'account era fuori); cambio di `auth_user_id` (vecchio e nuovo);
-- inserimento di una riga già collegata a un account che aveva una sessione;
-- cancellazione della riga.
--
-- Il confronto `is distinct from` è dentro la funzione, così un aggiornamento
-- che riscrive gli stessi valori — quello che resetData() fa a ogni prova —
-- non chiude niente. §4.7 lasciava la scelta fra una clausola WHEN su OLD e
-- NEW, che davvero non si dichiara insieme per INSERT e per DELETE, e il
-- confronto nel corpo: qui si è presa la seconda.
--
-- ⚠︎ E allora i trigger sono TRE per scelta, non per necessità. La versione
-- consegnata il 24/09/2026 diceva «tre e non uno, perché una clausola WHEN non
-- si dichiara insieme per INSERT e per DELETE»: è una ragione FALSA, perché in
-- questo file una clausola WHEN non c'è. Misurato dalla revisione: un trigger
-- solo, `after insert or update of is_active, auth_user_id or delete`, lascia
-- la suite intera verde. Restano tre perché ognuno dichiara il proprio evento
-- e perché `supabase/rientro/0014_rientro_sessione_viva.sql` li spegne per
-- nome. ⚠︎ Coda velenosa dichiarata e NON presidiata: fonderli o rinominarli è
-- invisibile alla suite e farebbe fallire il rientro con `42704`, riaprendo il
-- reperto S4-4 in silenzio.
--
-- La cancellazione delle sessioni si porta via i token di aggiornamento
-- (refresh_tokens_session_id_fkey, on delete cascade). I token con
-- `session_id` nullo, che quella cascata non raggiunge, si cancellano per
-- user_id: in auth.refresh_tokens la colonna è `varchar`, non `uuid`.
--
-- Questa funzione NON tocca le password: la procedura del telefono perso
-- (D3-20) cambia la password dalla dashboard, in modo che chi ha in mano un
-- telefono rubato non possa chiudere fuori il salone cambiando le credenziali
-- delle colleghe.
create function app.chiudi_sessioni_di(p_auth_user_id uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_chiuse integer;
begin
  if p_auth_user_id is null then
    return 0;
  end if;
  delete from auth.sessions where user_id = p_auth_user_id;
  get diagnostics v_chiuse = row_count;
  delete from auth.refresh_tokens where user_id = p_auth_user_id::text and session_id is null;
  return v_chiuse;
end
$$;

create function app.chiudi_sessioni_operatrice() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform app.chiudi_sessioni_di(new.auth_user_id);
    return null;
  elsif tg_op = 'DELETE' then
    perform app.chiudi_sessioni_di(old.auth_user_id);
    return null;
  end if;

  if old.is_active is distinct from new.is_active then
    perform app.chiudi_sessioni_di(new.auth_user_id);
  end if;
  if old.auth_user_id is distinct from new.auth_user_id then
    perform app.chiudi_sessioni_di(old.auth_user_id);
    perform app.chiudi_sessioni_di(new.auth_user_id);
  end if;
  return null;
end
$$;

create trigger zz_chiudi_sessioni_ins
after insert on operator
for each row execute function app.chiudi_sessioni_operatrice();

create trigger zz_chiudi_sessioni_upd
after update of is_active, auth_user_id on operator
for each row execute function app.chiudi_sessioni_operatrice();

create trigger zz_chiudi_sessioni_del
after delete on operator
for each row execute function app.chiudi_sessioni_operatrice();

-- Il pulsante «Chiudi tutte le sessioni» del 3c. Il bersaglio si risolve da
-- `operator`: una firma che accettasse un id di auth.users permetterebbe di
-- chiudere le sessioni di un account qualunque. E rifiuta l'operatrice di chi
-- chiama: per le proprie sessioni c'è l'uscita con ambito globale, e chiudersi
-- fuori da soli non deve essere possibile per sbaglio.
create function public.chiudi_sessioni(p_operator_id uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bersaglio uuid;
  v_io        uuid;
begin
  if not (select app.is_active_operator()) then
    raise exception 'chiudi_sessioni: chi chiama non è un operatrice attiva'
      using errcode = 'P0004';
  end if;

  select o.auth_user_id into v_bersaglio from public.operator o where o.id = p_operator_id;
  if not found then
    raise exception 'chiudi_sessioni: % non è un operatrice', p_operator_id using errcode = 'P0004';
  end if;

  select o.auth_user_id into v_io from public.operator o where o.auth_user_id = auth.uid();
  if v_bersaglio is not distinct from v_io then
    raise exception 'chiudi_sessioni: per le proprie sessioni si esce con ambito globale'
      using errcode = 'P0004';
  end if;

  return app.chiudi_sessioni_di(v_bersaglio);
end
$$;

revoke execute on function
  app.chiudi_sessioni_di(uuid),
  app.chiudi_sessioni_operatrice(),
  public.chiudi_sessioni(uuid)
from public, anon;

grant execute on function public.chiudi_sessioni(uuid) to authenticated;
