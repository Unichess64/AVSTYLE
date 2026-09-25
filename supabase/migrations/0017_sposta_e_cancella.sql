-- supabase/migrations/0017_sposta_e_cancella.sql
--
-- Le due funzioni gemelle di salva_visita. Stesse regole 0, 2, 5, 6, 8, 9, 10,
-- 11 (design 3a §4.1); qui sotto solo ciò che cambia.
--
-- sposta_visita_a riceve la DESTINAZIONE ASSOLUTA di ciascun appuntamento —
-- data e nuovo inizio, calcolati dall'app conservando gli scarti — e non uno
-- scarto relativo: un invio ripetuto con lo scarto sposterebbe due volte.
-- L'insieme degli id di destinazione deve coincidere con l'insieme atteso.
create function public.sposta_visita_a(
  p_codice        uuid,
  p_visita        uuid,
  p_data          date,
  p_destinazioni  jsonb,
  p_visita_attesa text,
  p_attesi        jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_registrato text;
  v_trovata    boolean := false;
  v_cancellata boolean := false;
  v_versione   text;
  v_correnti   jsonb;
  v_toccate    integer;
  v_stato      jsonb;
  r            record;
begin
  if not (select app.is_active_operator()) then
    raise exception 'sposta_visita_a: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  set constraints public.appointment_slot_unique deferred;

  v_registrato := app.apri_invio(p_codice);
  if v_registrato is not null then
    if v_registrato = 'in_corso' then
      raise exception 'sposta_visita_a: codice % già in corso', p_codice using errcode = 'P0003';
    end if;
    return jsonb_build_object('esito', v_registrato);
  end if;

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

  if not coalesce(v_trovata, false) then
    perform app.chiudi_invio(p_codice, case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
    return jsonb_build_object('esito', case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
  end if;

  if v_versione is distinct from p_visita_attesa
     or coalesce(p_attesi, '[]'::jsonb) is distinct from v_correnti then
    v_stato := public.stato_visita(p_visita);
    perform app.chiudi_invio(p_codice, 'modificata_altrove');
    return jsonb_build_object('esito', 'modificata_altrove', 'stato', v_stato);
  end if;

  -- L'insieme delle destinazioni deve essere ESATTAMENTE quello atteso: una
  -- destinazione in meno cancellerebbe un appuntamento per omissione, e questa
  -- funzione non cancella niente.
  if (select array_agg(x order by x) from (
        select (e ->> 'id')::uuid as x from jsonb_array_elements(p_destinazioni) e) s)
     is distinct from
     (select array_agg(x order by x) from (
        select (e ->> 'id')::uuid as x from jsonb_array_elements(v_correnti) e) s2) then
    raise exception 'sposta_visita_a: le destinazioni non coprono esattamente gli appuntamenti della visita'
      using errcode = '22023';
  end if;

  update public.visit v set visit_date = p_data where v.id = p_visita;
  get diagnostics v_toccate = row_count;
  if v_toccate <> 1 then
    raise exception 'sposta_visita_a: la visita non è più visibile a chi scrive' using errcode = '42501';
  end if;

  for r in
    select (e ->> 'id')::uuid as id, (e ->> 'inizio')::smallint as inizio
    from jsonb_array_elements(p_destinazioni) e
  loop
    update public.appointment a
       set start_cell = r.inizio, appointment_date = p_data
     where a.id = r.id and a.visit_id = p_visita;
    get diagnostics v_toccate = row_count;
    if v_toccate <> 1 then
      raise exception 'sposta_visita_a: appuntamento % non più visibile', r.id using errcode = '42501';
    end if;
  end loop;

  set constraints public.appointment_slot_unique immediate;
  perform app.chiudi_invio(p_codice, 'salvata');

  return jsonb_build_object(
    'esito', 'salvata',
    'visita', (select app.versione(v.updated_at) from public.visit v where v.id = p_visita),
    'appuntamenti', (
      select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id), '[]'::jsonb)
      from public.appointment a where a.visit_id = p_visita)
  );
end
$$;

-- cancella_visita: UNA SOLA delete su `visit`. Cancellare prima gli
-- appuntamenti farebbe scattare zz_delete_orphan_visit (0008) e la delete
-- sulla visita toccherebbe zero righe, che la regola 11 leggerebbe come errore
-- su una cancellazione riuscita. La cascata di appointment_visit_date_fk porta
-- via gli appuntamenti da sola.
create function public.cancella_visita(
  p_codice        uuid,
  p_visita        uuid,
  p_visita_attesa text,
  p_attesi        jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_registrato text;
  v_trovata    boolean := false;
  v_cancellata boolean := false;
  v_versione   text;
  v_correnti   jsonb;
  v_toccate    integer;
  v_stato      jsonb;
begin
  if not (select app.is_active_operator()) then
    raise exception 'cancella_visita: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  v_registrato := app.apri_invio(p_codice);
  if v_registrato is not null then
    if v_registrato = 'in_corso' then
      raise exception 'cancella_visita: codice % già in corso', p_codice using errcode = 'P0003';
    end if;
    return jsonb_build_object('esito', v_registrato);
  end if;

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

  if not coalesce(v_trovata, false) then
    perform app.chiudi_invio(p_codice, case when v_cancellata then 'gia_cancellata' else 'non_trovata' end);
    return jsonb_build_object('esito', case when v_cancellata then 'gia_cancellata' else 'non_trovata' end);
  end if;

  if v_versione is distinct from p_visita_attesa
     or coalesce(p_attesi, '[]'::jsonb) is distinct from v_correnti then
    v_stato := public.stato_visita(p_visita);
    perform app.chiudi_invio(p_codice, 'modificata_altrove');
    return jsonb_build_object('esito', 'modificata_altrove', 'stato', v_stato);
  end if;

  delete from public.visit v where v.id = p_visita;
  get diagnostics v_toccate = row_count;
  if v_toccate <> 1 then
    raise exception 'cancella_visita: la visita non è più visibile a chi scrive' using errcode = '42501';
  end if;

  perform app.chiudi_invio(p_codice, 'cancellata');
  return jsonb_build_object('esito', 'cancellata');
end
$$;

revoke execute on function
  public.sposta_visita_a(uuid, uuid, date, jsonb, text, jsonb),
  public.cancella_visita(uuid, uuid, text, jsonb)
from public, anon;

grant execute on function
  public.sposta_visita_a(uuid, uuid, date, jsonb, text, jsonb),
  public.cancella_visita(uuid, uuid, text, jsonb)
to authenticated;
