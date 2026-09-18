-- La query a INTERVALLO DI DATE di spec §7.5: una sola andata e ritorno per
-- tutti i 28 giorni del cercaposti (§8.3), invece di una al giorno.
--
-- Restituisce MATERIALE GREZZO e non fasce risolte: la risoluzione di §7.1 —
-- l'eccezione che sostituisce il giorno, la sottrazione delle chiusure, la
-- piega — vive in TypeScript, dove ogni sua riga si può guastare una per volta
-- e pretendere che una prova nominata diventi rossa.
--
-- security INVOKER: la sicurezza per riga deve arbitrare la lettura come per
-- ogni altra tabella. Un account autenticato che non è operatrice riceve
-- elenchi vuoti, non un errore e non i dati.
--
-- search_path vuoto e ogni riferimento qualificato per schema, come ogni altra
-- funzione di questo database.
--
-- (Nota misurata: questa funzione non viene mai messa in linea, ma NON per il
-- `search_path`. Popolare `proconfig` basterebbe a impedirlo, e infatti lo
-- impedisce su una funzione banale; qui però la bloccano già i sotto-select
-- del corpo, quindi il `set` non aggiunge niente su quel fronte. È il motivo
-- per cui `explain` sulla chiamata mostra solo un `Result` e il piano interno
-- resta invisibile senza `auto_explain`.)
--
-- OPERATRICI DISATTIVATE: filtrate su DISPONIBILITÀ ed ECCEZIONI, non
-- sull'OCCUPAZIONE (D2-10). Spec §7.4 dice che l'insieme delle idonee lo
-- risolve il chiamante, ristretto alle attive; queste due giunzioni non lo
-- sostituiscono, gli fanno da rete, perché il danno che la spec nomina —
-- proporre appuntamenti con chi se n'è andata il mese scorso — è troppo
-- silenzioso per lasciarlo a una sola difesa.
--
-- L'occupazione NON si filtra, ed è misurato perché: filtrandola, la finestra
-- dichiarava libera una cella che il vincolo `appointment_slot_unique` poi
-- rifiuta con 23505. La disponibilità dice chi si PUÒ proporre; l'occupazione
-- dice che cosa è GIÀ SUCCESSO, e quello resta vero anche se l'operatrice è
-- stata disattivata ieri. Dal cercaposti la differenza non è raggiungibile —
-- senza fasce non si propone nulla — ma da un percorso di scrittura diretta
-- sì, e lì l'agenda mostrerebbe una cella libera che esplode al salvataggio.
create function public.availability_window(
  p_from         date,
  p_to           date,
  p_operator_ids uuid[]
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    -- La settimana tipica non ha date: si filtra per operatrice soltanto.
    'weekly', coalesce((
      select jsonb_agg(jsonb_build_object(
               'operator_id',    w.operator_id,
               'weekday',        w.weekday,
               'start_boundary', w.start_boundary,
               'end_boundary',   w.end_boundary)
             order by w.operator_id, w.weekday, w.start_boundary)
      from public.weekly_availability w
      join public.operator o on o.id = w.operator_id and o.is_active
      where w.operator_id = any(p_operator_ids)
        -- La settimana tipica non ha date, quindi è l'UNICA sezione che una
        -- data nulla non svuoterebbe da sé: senza questa riga il documento
        -- direbbe «l'operatrice lavora, il salone non è mai chiuso, niente è
        -- prenotato», cioè fallirebbe APERTO. Misurato. Le altre tre hanno un
        -- predicato sulle date e con un nullo restituiscono già zero righe.
        and p_from is not null
        and p_to is not null
    ), '[]'::jsonb),

    -- Le fasce dell'eccezione stanno ANNIDATE sotto il loro giorno, e un
    -- giorno senza fasce resta nell'elenco con `ranges` vuoto: è l'assenza
    -- dichiarata di §6.5, e perderla farebbe tornare la settimana tipica.
    'exceptions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'operator_id', e.operator_id,
               'date',        e.exception_date,
               'ranges', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'start_boundary', r.start_boundary,
                          'end_boundary',   r.end_boundary)
                        order by r.start_boundary)
                 from public.exception_range r
                 where r.exception_day_id = e.id
               ), '[]'::jsonb))
             order by e.exception_date, e.operator_id)
      from public.exception_day e
      join public.operator o on o.id = e.operator_id and o.is_active
      where e.operator_id = any(p_operator_ids)
        and e.exception_date between p_from and p_to
    ), '[]'::jsonb),

    -- SOVRAPPOSIZIONE, non contenimento: una chiusura dal 1 al 31 marzo
    -- riguarda il 12 marzo pur non stando dentro un intervallo di un giorno.
    -- `between` sulle sue date la perderebbe e il salone risulterebbe aperto
    -- in una settimana di ferie.
    --
    -- NON filtrata per operatrice: una chiusura è del salone, non di una
    -- persona. Conseguenza dichiarata in D2-8: con p_operator_ids nullo il
    -- documento non è interamente vuoto, contiene ancora le chiusure.
    'closures', coalesce((
      select jsonb_agg(jsonb_build_object(
               'start_date',    c.start_date,
               'end_date',      c.end_date,
               'from_boundary', c.from_boundary,
               'to_boundary',   c.to_boundary,
               'reason',        c.reason)
             order by c.start_date, c.id)
      from public.salon_closure c
      where c.start_date <= p_to and c.end_date >= p_from
    ), '[]'::jsonb),

    -- `cell_count` GREZZO, non `end_cell`: l'ultima cella occupata la calcola
    -- `blocco()` in src/dominio/tempo.ts e nessun altro (D2-1). Avere la
    -- stessa somma anche qui vorrebbe dire due copie in due lingue, e la
    -- seconda si corregge sempre dopo la prima.
    --
    -- La giunzione su `service` è obbligatoria: la pausa di riassetto sta sul
    -- SERVIZIO, e senza di lei la regola di §7.3 non è calcolabile dal
    -- chiamante.
    'occupancy', coalesce((
      select jsonb_agg(jsonb_build_object(
               'appointment_id',     a.id,
               'operator_id',        a.operator_id,
               'date',               a.appointment_date,
               'start_cell',         a.start_cell,
               'cell_count',         a.cell_count,
               'buffer_after_cells', s.buffer_after_cells)
             order by a.appointment_date, a.operator_id, a.start_cell)
      from public.appointment a
      join public.service s on s.id = a.service_id
      where a.operator_id = any(p_operator_ids)
        and a.appointment_date between p_from and p_to
    ), '[]'::jsonb)
  );
$$;

-- Supabase concede EXECUTE ad anon per difetto su ogni funzione nuova in
-- public. Si revoca da public (che raggiunge chiunque, compresi i ruoli
-- futuri) e da anon per nome, e si concede ad authenticated.
--
-- ⚠ Questo NON rende la funzione eseguibile dal solo `authenticated`:
-- misurato il 18 settembre 2026, `service_role` detiene EXECUTE anche sulle
-- funzioni del piano 1 che fanno esattamente questa coppia di istruzioni. La
-- concessione viene dal bootstrap di Supabase, fuori da queste migrazioni. È
-- atteso — service_role è il ruolo lato server — ma nessun commento qui può
-- dire «solo authenticated», perché sarebbe falso.
revoke execute on function public.availability_window(date, date, uuid[]) from public, anon;
grant  execute on function public.availability_window(date, date, uuid[]) to authenticated;
