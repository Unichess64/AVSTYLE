-- supabase/migrations/0016_salva_visita.sql
--
-- Crea o modifica una visita, tutto o niente. Design 3a §4.1, regole 0-11.
--
-- Perché una funzione e non più chiamate: su PostgREST ogni chiamata è la sua
-- transazione, quindi una modifica fatta di due scritture lascia la visita a
-- metà al primo errore, e uno scambio d'orario fra due servizi della stessa
-- operatrice non si salva in nessun ordine (D29, spec §4.6).
--
-- L'ORDINE delle cose, che è tutto:
--   0. il codice d'invio, PRIMA di qualunque scrittura: una scrittura fatta
--      prima sopravviverebbe al conflitto sulla chiave (misurato).
--   2. blocco della visita, poi — in un'istruzione SEPARATA — blocco degli
--      appuntamenti e lettura delle cancellate: una lettura fatta nella stessa
--      istruzione del blocco vedrebbe la fotografia presa prima dell'attesa.
--   3-6. i confronti, tutti PRIMA di scrivere.
--   8. le scritture: cliente nuova, visita, aggiornamenti, inserimenti, e per
--      ULTIME le cancellazioni, così zz_delete_orphan_visit non trova mai la
--      visita vuota a metà funzione.
--   11. ogni UPDATE e DELETE conta le righe toccate: con la sicurezza per riga
--      un account chiuso nell'istante della scrittura ne tocca zero SENZA
--      errore, e la funzione registrerebbe un falso «salvata».

-- Lo stato corrente di una visita, come lo mostra la scheda dopo
-- «modificata altrove» e come lo legge «Controlla» (Task 7).
--
-- ⚠︎ DUE VINCOLI, scritti il 25/09/2026 dopo le revisioni avversariali.
--
-- 1. È `stable`, e §4.4 vieta a «Controlla» le funzioni `stable` che leggano
--    «con la fotografia presa prima dell'attesa». Si concilia così, ed è ora
--    scritto anche nella spec (§4.4, revisione 15): `stato_visita` si chiama in
--    un'ISTRUZIONE PROPRIA, dopo l'attesa sul codice d'invio, mai nella stessa
--    istruzione dell'`insert into invio` e mai in una CTE con esso.
--
-- 2. I suoi `appuntamenti` hanno SEI chiavi; `p_attesi` di `salva_visita` ne
--    vuole DUE, `{id, versione}`, ordinate per `id`. Chi riparte da qui dopo un
--    «modificata altrove» deve proiettare e ordinare, altrimenti rimbalza per
--    sempre (misurato). Contratto in spec §4.1 regola 6; presidiato da tre
--    prove in `tests/schema/salva-visita.test.ts`.
create function public.stato_visita(p_visita uuid) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case when v.id is null then null else jsonb_build_object(
    'visita', app.versione(v.updated_at),
    'data', v.visit_date,
    'cliente', v.client_id,
    'appuntamenti', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', a.id, 'versione', app.versione(a.updated_at),
               'operatrice', a.operator_id, 'servizio', a.service_id,
               'inizio', a.start_cell, 'durata', a.cell_count) order by a.id), '[]'::jsonb)
      from public.appointment a where a.visit_id = v.id
    )
  ) end
  from public.visit v where v.id = p_visita
$$;

create function public.salva_visita(
  p_codice        uuid,
  p_visita        uuid,
  p_cliente       uuid,
  p_cliente_nuova jsonb,
  p_data          date,
  p_appuntamenti  jsonb,
  p_visita_attesa text,
  p_attesi        jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_registrato   text;
  v_modifica     boolean := p_visita_attesa is not null;
  v_trovata      boolean := false;
  v_cancellata   boolean := false;
  v_versione     text;
  v_correnti     jsonb;
  v_ids_nuovi    uuid[];
  v_insieme_cambia boolean := false;
  v_toccate      integer;
  v_stato        jsonb;
  r              record;
begin
  -- Rifiuto esplicito (decisione dell'utente del 23/09). Senza, un account che
  -- non è operatrice riceve `non_trovata`, perché la sicurezza per riga gli
  -- nasconde la visita: la difesa funziona, ma il messaggio è ambiguo e la
  -- scelta non sarebbe presidiata da nessuna prova.
  --
  -- ⚠︎ Misurato il 25/09/2026 togliendo questa guardia, con una sessione vera
  -- di un account che non è operatrice: in MODIFICA arriva davvero
  -- `esito = non_trovata`, cioè un esito di dominio che la scheda tradurrebbe
  -- in «questa visita non esiste più»; in CREAZIONE arriva invece
  -- `42501 new row violates row-level security policy for table "visit"`.
  -- Quindi la mutazione è SENZA VITTIME nella suite di oggi ma NON è
  -- equivalente: cambia l'esito in modifica. Il presidio è la prova
  -- OUTSIDER-WRITE del Task 9 («risponde sempre 42501, mai un esito di
  -- dominio»), e fino ad allora questa riga resta non presidiata.
  if not (select app.is_active_operator()) then
    raise exception 'salva_visita: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  -- Regola 9: il vincolo dell'occupazione resta differito fino alla fine, così
  -- gli spostamenti interni non collidono con sé stessi. Nominato e non ALL:
  -- ALL sveglierebbe anche zz_touch_client_activity (0007), che è differito
  -- apposta (vedi il commento di testa di 0010).
  set constraints public.appointment_slot_unique deferred;

  -- Regola 0.
  v_registrato := app.apri_invio(p_codice);
  if v_registrato is not null then
    if v_registrato = 'in_corso' then
      raise exception 'salva_visita: il codice % è già in corso in questa transazione', p_codice
        using errcode = 'P0003';
    end if;
    return jsonb_build_object('esito', case when v_registrato = 'annullato' then 'annullato' else v_registrato end);
  end if;

  -- Regola 7, prima parte: almeno un appuntamento, e nessun id ripetuto.
  if p_appuntamenti is null or jsonb_typeof(p_appuntamenti) <> 'array'
     or jsonb_array_length(p_appuntamenti) = 0 then
    raise exception 'salva_visita: serve almeno un appuntamento; per togliere tutto si usa cancella_visita'
      using errcode = '22023';
  end if;
  select array_agg((e ->> 'id')::uuid) into v_ids_nuovi
  from jsonb_array_elements(p_appuntamenti) e;
  if (select count(distinct x) from unnest(v_ids_nuovi) x) <> array_length(v_ids_nuovi, 1) then
    raise exception 'salva_visita: id di appuntamento ripetuto' using errcode = '22023';
  end if;

  -- Regola 2: blocco, poi lettura in istruzioni separate.
  select true, app.versione(v.updated_at) into v_trovata, v_versione
  from public.visit v where v.id = p_visita for update;

  perform 1 from public.appointment a where a.visit_id = p_visita order by a.id for update;

  select coalesce(
           jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id),
           '[]'::jsonb)
    into v_correnti
  from public.appointment a where a.visit_id = p_visita;

  select true into v_cancellata from public.visita_cancellata vc where vc.id = p_visita;
  v_cancellata := coalesce(v_cancellata, false);

  -- Regole 3, 4, 5, 6.
  if not v_modifica then
    if coalesce(v_trovata, false) then
      perform app.chiudi_invio(p_codice, 'esiste_gia');
      return jsonb_build_object('esito', 'esiste_gia');
    elsif v_cancellata then
      perform app.chiudi_invio(p_codice, 'cancellata_altrove');
      return jsonb_build_object('esito', 'cancellata_altrove');
    end if;
  else
    if not coalesce(v_trovata, false) then
      if v_cancellata then
        perform app.chiudi_invio(p_codice, 'cancellata_altrove');
        return jsonb_build_object('esito', 'cancellata_altrove');
      end if;
      perform app.chiudi_invio(p_codice, 'non_trovata');
      return jsonb_build_object('esito', 'non_trovata');
    end if;

    if v_versione is distinct from p_visita_attesa
       or coalesce(p_attesi, '[]'::jsonb) is distinct from v_correnti then
      v_stato := public.stato_visita(p_visita);
      -- Se nel frattempo la visita non è più leggibile (cancellata da una
      -- collega, o account chiuso), `stato` sarebbe NULL e la scheda non
      -- avrebbe niente da mostrare: l'esito giusto è l'altro.
      if v_stato is null then
        perform app.chiudi_invio(p_codice, case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
        return jsonb_build_object('esito', case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
      end if;
      perform app.chiudi_invio(p_codice, 'modificata_altrove');
      return jsonb_build_object('esito', 'modificata_altrove', 'stato', v_stato);
    end if;
  end if;

  -- Regola 7, seconda parte: ogni id esistente deve appartenere a QUESTA visita.
  perform 1
  from unnest(v_ids_nuovi) x
  join public.appointment a on a.id = x
  where a.visit_id is distinct from p_visita;
  if found then
    raise exception 'salva_visita: un appuntamento dell elenco appartiene a un altra visita'
      using errcode = '22023';
  end if;

  -- Regola 8, prima scrittura: la cliente nuova, nella stessa transazione.
  if p_cliente_nuova is not null then
    insert into public.client (id, full_name, phone, birth_month, birth_day)
    values (
      p_cliente,
      p_cliente_nuova ->> 'nome',
      p_cliente_nuova ->> 'telefono',
      (p_cliente_nuova ->> 'mese')::smallint,
      (p_cliente_nuova ->> 'giorno')::smallint
    )
    on conflict (id) do nothing;
  end if;

  if not v_modifica then
    insert into public.visit (id, client_id, visit_date) values (p_visita, p_cliente, p_data);
  else
    update public.visit v
       set visit_date = p_data, client_id = p_cliente
     where v.id = p_visita
       and (v.visit_date, v.client_id) is distinct from (p_data, p_cliente);
    get diagnostics v_toccate = row_count;
    -- Regola 11: RAGGIUNTA DAVVERO, ma indistinguibile sul solo codice.
    --
    -- Misurata al quinto giro di revisione su banco usa e getta, 3 volte su 3.
    -- La forma che ci arriva: una collega tiene aperta una scrittura sulla riga
    -- della cliente; qui `salva_visita` si ferma sull'`insert into
    -- public.client` della cliente nuova, cioè DOPO la regola 2 e DOPO la
    -- regola 6, con argomenti tutti corretti; mentre è ferma, l'operatrice
    -- viene disattivata; quando il blocco si libera questo UPDATE apre la sua
    -- fotografia nuova, è cieco, tocca zero righe, e arriva qui.
    -- (Ci si arriva anche col blocco sulla visita, purché `p_attesi` sia vuoto:
    -- lo scarto con la misura del quarto giro era solo quello.)
    --
    -- ⚠︎ Togliendo questo riesame la transazione muore lo stesso un passo dopo,
    -- con lo STESSO codice 42501 ma dal `with check` della politica su
    -- `appointment`. Quindi il presidio è la prova che asserisce il MESSAGGIO,
    -- non il codice: «la regola 11 ferma la scrittura quando la visibilità cade
    -- DOPO i confronti», in `tests/schema/salva-visita.test.ts`.
    if v_toccate = 0 and not exists (select 1 from public.visit v where v.id = p_visita) then
      raise exception 'salva_visita: la visita non è più visibile a chi scrive' using errcode = '42501';
    end if;
  end if;

  -- Aggiornamenti: SOLO le righe che cambiano davvero. Aggiornare una riga
  -- identica alzerebbe la sua versione e darebbe «modificata altrove» alla
  -- scheda aperta di una collega.
  for r in
    select (e ->> 'id')::uuid           as id,
           (e ->> 'operatrice')::uuid   as operatrice,
           (e ->> 'servizio')::uuid     as servizio,
           (e ->> 'inizio')::smallint   as inizio,
           (e ->> 'durata')::smallint   as durata
    from jsonb_array_elements(p_appuntamenti) e
  loop
    if exists (select 1 from public.appointment a where a.id = r.id and a.visit_id = p_visita) then
      update public.appointment a
         set operator_id = r.operatrice,
             service_id  = r.servizio,
             start_cell  = r.inizio,
             cell_count  = r.durata,
             appointment_date = p_data
       where a.id = r.id
         and (a.operator_id, a.service_id, a.start_cell, a.cell_count, a.appointment_date)
             is distinct from (r.operatrice, r.servizio, r.inizio, r.durata, p_data);
      get diagnostics v_toccate = row_count;
      -- Regola 11, stessa forma e stesso ragionamento di sopra.
      if v_toccate = 0 and not exists (select 1 from public.appointment a where a.id = r.id) then
        raise exception 'salva_visita: l appuntamento % non è più visibile a chi scrive', r.id
          using errcode = '42501';
      end if;
    else
      insert into public.appointment
        (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
      values (r.id, p_visita, r.operatrice, r.servizio, p_data, r.inizio, r.durata);
      v_insieme_cambia := true;
    end if;
  end loop;

  -- Per ULTIME le cancellazioni (regola 8).
  for r in
    select a.id from public.appointment a
    where a.visit_id = p_visita and not (a.id = any (v_ids_nuovi))
  loop
    delete from public.appointment a where a.id = r.id;
    get diagnostics v_toccate = row_count;
    -- Regola 11: zero righe qui vuol dire «non mi è più visibile», non
    -- «versione diversa»: il confronto è già stato fatto sotto blocco.
    if v_toccate <> 1 then
      -- Messaggio DIVERSO da quello del riesame dopo `update public.visit`: due
      -- raise con lo stesso testo renderebbero ambigua la prova della regola 11,
      -- che asserisce con `toContain`.
      raise exception 'salva_visita: la visita non è più visibile a chi scrive (versione dell insieme)'
        using errcode = '42501';
    end if;
    v_insieme_cambia := true;
  end loop;

  -- La versione della visita deve cambiare anche quando cambia solo l'INSIEME:
  -- altrimenti «una collega ha aggiunto e poi tolto» torna identico a «non è
  -- mai arrivato» (design 3a §4.1 punto 3, misurato al quinto giro).
  if v_insieme_cambia and v_modifica then
    update public.visit v set visit_date = v.visit_date where v.id = p_visita;
    get diagnostics v_toccate = row_count;
    if v_toccate <> 1 then
      raise exception 'salva_visita: la visita non è più visibile a chi scrive' using errcode = '42501';
    end if;
  end if;

  set constraints public.appointment_slot_unique immediate;

  perform app.chiudi_invio(p_codice, 'salvata');

  return jsonb_build_object(
    'esito', 'salvata',
    'visita', (select app.versione(v.updated_at) from public.visit v where v.id = p_visita),
    'appuntamenti', (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id),
        '[]'::jsonb)
      from public.appointment a where a.visit_id = p_visita
    )
  );
end
$$;

revoke execute on function
  public.salva_visita(uuid, uuid, uuid, jsonb, date, jsonb, text, jsonb),
  public.stato_visita(uuid)
from public, anon;

grant execute on function
  public.salva_visita(uuid, uuid, uuid, jsonb, date, jsonb, text, jsonb),
  public.stato_visita(uuid)
to authenticated;
