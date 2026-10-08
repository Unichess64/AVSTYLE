-- 0022 — La disponibilità dall'app, e i colori chiari.
--
-- Il numero: 0022 (decisione dell'utente del 07/10, D3c-10). Il 3b, rinviato,
-- prenderà 0025 o oltre: una 0022 arrivata dopo una 0023 già online verrebbe
-- rifiutata da `supabase db push`.

-- I colori di D3c-11: riempimenti chiari, il bordo d'inchiostro lo mette da sé
-- src/cliente/vista.ts quando il contrasto col fondo è sotto 3.
update public.operator set color = '#F3A4BA' where name = 'Vera';
update public.operator set color = '#FFD8B0' where name = 'Alessandra';

-- Le fasce di UN giorno della settimana tipo, in una chiamata sola: con due
-- chiamate PostgREST (cancella, poi inserisci) un guasto in mezzo lascerebbe il
-- giorno vuoto, cioè «non lavora» ogni settimana. Fasce sovrapposte: 23P01
-- dall'exclude di 0006, e la transazione intera si annulla.
create function public.scrivi_giorno_settimana(
  p_operator_id uuid,
  p_weekday     smallint,
  p_fasce       jsonb
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_scritte integer := 0;
  v_fascia  jsonb;
begin
  if p_operator_id is null or p_weekday is null then
    raise exception 'scrivi_giorno_settimana: operatrice e giorno sono obbligatori'
      using errcode = '22004';
  end if;

  delete from public.weekly_availability
   where operator_id = p_operator_id and weekday = p_weekday;

  for v_fascia in select value from jsonb_array_elements(coalesce(p_fasce, '[]'::jsonb)) loop
    insert into public.weekly_availability (operator_id, weekday, start_boundary, end_boundary)
    values (p_operator_id, p_weekday, (v_fascia ->> 0)::smallint, (v_fascia ->> 1)::smallint);
    v_scritte := v_scritte + 1;
  end loop;

  return v_scritte;
end;
$$;

-- Ogni funzione nuova nasce eseguibile da anon: si revoca.
revoke execute on function public.scrivi_giorno_settimana(uuid, smallint, jsonb) from public, anon;
grant  execute on function public.scrivi_giorno_settimana(uuid, smallint, jsonb) to authenticated;
