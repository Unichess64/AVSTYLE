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
    -- ⚠︎ Il ramo che `0016:171-177` aveva e che questo file non aveva copiato,
    -- portato qui il 27/09/2026 dopo che la misura ha mostrato l'asimmetria.
    -- Se la visita non è più leggibile, `stato` è NULL e la scheda non ha
    -- niente da mostrare, mentre §4.4 le impone di ridisegnarsi «dallo stato
    -- corrente»: l'esito giusto è l'altro.
    --
    -- Misurato il 26/09/2026 su banco usa e getta, PRIMA di questo ramo: con il
    -- guardiano che blocca un appuntamento, la funzione supera il `for update`
    -- sulla visita (quindi `v_trovata` è già true), si ferma su quello degli
    -- appuntamenti, e mentre è ferma l'operatrice viene disattivata — la
    -- disattivazione committata cancella le sue sessioni (0015), quindi la
    -- sicurezza per riga le nasconde tutto. Nello STESSO istante e con la STESSA
    -- forma, `salva_visita` rispondeva `non_trovata` e queste due
    -- `modificata_altrove` con `stato: null`.
    --
    -- ⚠︎ DUE COSE MISURATE IL 27/09/2026 dalla revisione mirata, che il primo
    -- commento di questo ramo diceva male.
    --
    -- 1. NON è vero che l'asimmetria «costava al Task 7 la riga sbagliata»:
    --    `modificata_altrove` e `non_trovata` cadono ENTRAMBI nella riga 6 di
    --    §4.4. Costava il MESSAGGIO dentro quella riga, non la riga.
    -- 2. La visita, in questo scenario, C'È ANCORA: è caduto il permesso di
    --    leggerla, non la riga. Quindi `non_trovata` qui è un'affermazione più
    --    forte del vero, e §4.4 (revisione 19) la disinnesca dal lato di
    --    «Controlla»: con esito `non_trovata`, se la LETTURA trova la visita si
    --    tratta come riga 1 — «Non risulta salvata» — e non si dice mai «questa
    --    visita non esiste più». Il Task 7 lo presidia con una prova.
    --
    -- ⚠︎ E il ramo `then` di questo `case when` è CODICE MORTO, misurato: cinque
    -- mutazioni su di esso (compreso scambiare i due letterali fra le gemelle)
    -- danno 0 rosse su 375, e non esiste porta per raggiungerlo. `v_stato is
    -- null` con `v_trovata` vero significa solo «permesso caduto», perché la
    -- visita è sotto `for update` e nessuno può cancellarla; ma `v_cancellata`
    -- si legge con la STESSA politica di `visit` (`0014`), quindi sotto lo stesso
    -- blackout è falsa. Perché fosse vera, la disattivazione dovrebbe committare
    -- fra quelle due istruzioni, e fra loro non c'è alcun punto di attesa da cui
    -- pilotarla. Si tiene per simmetria con `0016`, NON perché sia presidiato:
    -- chi copia questa forma in `0018` non la creda difesa da una prova.
    if v_stato is null then
      perform app.chiudi_invio(p_codice, case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
      return jsonb_build_object('esito', case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
    end if;
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

  -- ⚠︎ QUESTO UPDATE È INCONDIZIONATO, ED È OBBLIGATO: non metterci un
  -- `is distinct from` per obbedire alla lettera alla regola 8 di §4.1
  -- («update di data e cliente solo se cambiano»). Misurato il 25/09/2026:
  -- aggiungendo `and v.visit_date is distinct from p_data`, uno spostamento
  -- NELLO STESSO GIORNO — che §5.1 rende il caso normale, perché il
  -- trascinamento è solo verticale — tocca zero righe, e il riesame della
  -- regola 11 qui sotto solleva un FALSO `42501: la visita non è più visibile a
  -- chi scrive`. Tre prove rosse su 373, e la sola che sposta a un altro giorno
  -- resta verde. Per questo la spec (§4.1, revisione 17) dichiara
  -- `move_visit_to` ESENTE dalla parte della regola 8 sugli aggiornamenti
  -- condizionali, e ne scrive il prezzo: uno spostamento alza la versione anche
  -- degli appuntamenti che non si muovono.
  update public.visit v set visit_date = p_data where v.id = p_visita;
  get diagnostics v_toccate = row_count;
  if v_toccate <> 1 then
    raise exception 'sposta_visita_a: la visita non è più visibile a chi scrive' using errcode = '42501';
  end if;

  for r in
    select (e ->> 'id')::uuid as id, (e ->> 'inizio')::smallint as inizio
    from jsonb_array_elements(p_destinazioni) e
  loop
    -- Incondizionato per la stessa ragione dell'UPDATE sulla visita, qui
    -- sopra: il riesame della regola 11 legge zero righe come «non mi è più
    -- visibile», e un appuntamento che resta dov'era ne toccherebbe zero.
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
    -- Il ramo gemello di quello di `sposta_visita_a`: **le sue tre avvertenze
    -- valgono identiche qui**, e stanno scritte là per esteso (la ragione falsa
    -- sulla «riga sbagliata», la visita che in questo scenario c'è ancora, e il
    -- ramo `then` che è codice morto). Qui solo ciò che cambia.
    --
    -- Il letterale è `gia_cancellata` e non `cancellata_altrove` perché §4.1 dà
    -- quell'esito a `delete_visit` — «visita assente e fra le cancellate» — ed è
    -- lo stesso che il ramo «visita assente» di questa funzione usa poche righe
    -- sopra. Misurato il 27/09/2026: scambiarlo con quello della gemella dà
    -- 0 rosse su 375, perché il ramo `then` non è raggiungibile. La coerenza
    -- con §4.1 è quindi l'unica ragione per cui è quello giusto: nessuna prova
    -- lo difende.
    if v_stato is null then
      perform app.chiudi_invio(p_codice, case when v_cancellata then 'gia_cancellata' else 'non_trovata' end);
      return jsonb_build_object('esito', case when v_cancellata then 'gia_cancellata' else 'non_trovata' end);
    end if;
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
