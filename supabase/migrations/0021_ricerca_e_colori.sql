-- supabase/migrations/0021_ricerca_e_colori.sql
--
-- La ricerca delle clienti e il controllo dei doppioni, design 3a §4.8 e §5.4.
--
-- Passano da funzioni chiamate in POST e non da un filtro su `client`: un
-- filtro PostgREST mette il nome o il telefono nella QUERYSTRING, e la
-- querystring finisce nei log del gateway.
--
-- pg_trgm nello schema `extensions`, come unaccent e btree_gist: con
-- `search_path = ''` ogni riferimento va qualificato.
create extension if not exists pg_trgm with schema extensions;

create index client_nome_trgm on client
  using gin (public.immutable_unaccent(lower(full_name)) extensions.gin_trgm_ops);

create function public.cerca_clienti(p_testo text)
returns table (id uuid, full_name text, phone text, somiglianza real)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id,
         c.full_name,
         c.phone,
         extensions.similarity(public.immutable_unaccent(lower(c.full_name)),
                               public.immutable_unaccent(lower(p_testo))) as somiglianza
  from public.client c
  -- OPERATOR(schema.op) è l'unica forma valida per un operatore qualificato:
  -- `extensions.%` è un errore di sintassi e la migrazione non si crea
  -- (misurato).
  -- Testo vuoto: nessuna riga. Senza questa guardia il ramo del nome diventa
  -- `like '%%'` e l'elenco delle clienti esce intero (misurato).
  where coalesce(trim(p_testo), '') <> ''
    and (
       public.immutable_unaccent(lower(c.full_name))
          OPERATOR(extensions.%) public.immutable_unaccent(lower(p_testo))
     or public.immutable_unaccent(lower(c.full_name))
          like '%' || public.immutable_unaccent(lower(p_testo)) || '%'
     -- La guardia sulle cifre è obbligatoria: senza, una ricerca per nome
     -- riduce il ramo del telefono a `like '%%'`, vero per OGNI riga, e
     -- l'elenco delle clienti esce intero a ogni ricerca (misurato).
     or (regexp_replace(p_testo, '[^0-9]', '', 'g') <> ''
         and regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
             like '%' || regexp_replace(p_testo, '[^0-9]', '', 'g') || '%')
    )
  order by somiglianza desc, c.full_name
  limit 20
$$;

-- Il controllo dei doppioni di spec §8.2: stesso telefono (confrontato per
-- sole cifre, perché l'app normalizza in E.164 ma lo storico può non esserlo)
-- oppure nome simile.
create function public.doppioni_cliente(p_nome text, p_telefono text)
returns table (id uuid, full_name text, phone text, motivo text)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.full_name, c.phone, 'telefono'::text
  from public.client c
  where p_telefono is not null
    and regexp_replace(p_telefono, '[^0-9]', '', 'g') <> ''
    and regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
        = regexp_replace(p_telefono, '[^0-9]', '', 'g')
  union
  select c.id, c.full_name, c.phone, 'nome'::text
  from public.client c
  where p_nome is not null
    and extensions.similarity(public.immutable_unaccent(lower(c.full_name)),
                              public.immutable_unaccent(lower(p_nome))) >= 0.4
$$;

-- I colori di D3-6. Il primo piano aveva seminato altri valori; le
-- Impostazioni del 3c permetteranno di cambiarli.
--
-- Il guardiano di 0009 scatta su OGNI update di `operator` e pretende almeno
-- un'operatrice attiva **collegata a un account esistente**. Durante le
-- migrazioni `auth_user_id` è NULL per tutte e tre, perché il collegamento lo
-- fa `seed.sql`, che gira DOPO: un semplice `update … set color` fallisce con
-- `23514 refused: this would leave no last active operator linked to an
-- account` e fermerebbe `db reset` (misurato).
--
-- NON si spegne il trigger: un guasto fra il `disable` e l'`enable`, fuori da
-- una transazione, lo lascerebbe spento **per sempre**, e in produzione in
-- silenzio (misurato al terzo giro). Si restringe invece a ciò che deve
-- davvero sorvegliare — `is_active` e `auth_user_id` —, che è anche l'unica
-- cosa che il suo corpo guarda. Un cambio di colore o di ordine non lo tocca
-- più.
--
-- Due trigger e non uno: una clausola WHEN su OLD e NEW non si dichiara
-- insieme per UPDATE e DELETE.
drop trigger operator_lockout_guard on operator;

create constraint trigger operator_lockout_guard
  after update on operator
  deferrable initially immediate
  for each row
  when (old.is_active is distinct from new.is_active
        or old.auth_user_id is distinct from new.auth_user_id)
  execute function app.guard_operator_lockout();

create constraint trigger operator_lockout_guard_del
  after delete on operator
  deferrable initially immediate
  for each row
  execute function app.guard_operator_lockout();

update operator set color = '#C2185B' where name = 'Vera';
update operator set color = '#FFFFFF' where name = 'Annalisa';
update operator set color = '#9B1B1B' where name = 'Alessandra';

revoke execute on function
  public.cerca_clienti(text),
  public.doppioni_cliente(text, text)
from public, anon;

grant execute on function
  public.cerca_clienti(text),
  public.doppioni_cliente(text, text)
to authenticated;
