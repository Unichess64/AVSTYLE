-- supabase/migrations/0018_controlla_invio.sql
--
-- «Controlla» (design 3a D3-21 e §4.4): l'unica risposta a un salvataggio
-- rimasto senza risposta. NON ripete l'invio: lo brucia se non lo trova, così
-- «Non risulta salvata» è definitivo e l'invio tardivo non scrive più.
--
-- PERCHÉ plpgsql E ISTRUZIONI SEPARATE (misurato su banco separato al sesto
-- giro): scritta come CTE unica, «Controlla» ASPETTA correttamente sulla
-- chiave, ma poi legge con la fotografia presa PRIMA dell'attesa — codice
-- assente, visita vecchia — e direbbe «non risulta salvata» di un salvataggio
-- avvenuto. Per lo stesso motivo la funzione è `volatile`, non `stable`.
--
-- Il ricontrollo dell'account viene PRIMA di bruciare, e la ragione NON è un
-- falso «non risulta»: quello lo impedisce già il ricontrollo in coda, che
-- solleva lo stesso 42501 e annulla la transazione — misurato il 27/09/2026,
-- togliere questo non fa arrossire niente da solo. La ragione è lo SQLSTATE.
-- Senza di lui, un account chiuso il cui codice è OCCUPATO da un invio in volo
-- si mette in coda sulla chiave e muore di `lock_timeout` con 55P03, senza mai
-- arrivare al secondo ricontrollo: misurato, `expected '55P03' to be '42501'`.
-- §4.4 manda 42501 sull'USCITA FORZATA e 55P03 su «Non so se è stata salvata»,
-- quindi l'operatrice disattivata non verrebbe mai buttata fuori e ritenterebbe,
-- fino a 8 s per volta. Presidiato dalla prova «un account chiuso riceve 42501
-- anche quando il codice è occupato».

-- Gemella di app.apri_invio: registra il codice come 'annullato' se non c'è,
-- e restituisce l'esito già registrato se c'è. `on conflict do nothing` più il
-- conteggio, mai un blocco `exception`: un sottoblocco che cattura la chiave
-- duplicata lascia in piedi ciò che è stato scritto prima.
create function app.apri_invio_come_annullato(p_codice uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserite integer;
  v_esito    text;
begin
  insert into public.invio (codice, esito) values (p_codice, 'annullato')
  on conflict (codice) do nothing;
  get diagnostics v_inserite = row_count;
  if v_inserite = 1 then
    return 'annullato';
  end if;
  select i.esito into v_esito from public.invio i where i.codice = p_codice;
  if v_esito is null then
    -- Gemello di `app.apri_invio` (0013:115-119): la riga c'era — il conflitto
    -- lo prova — e non c'è più. Qui stava un `coalesce(..., 'annullato')' nel
    -- chiamante, che rispondeva riga 1, «l'invio non ha scritto nulla», per un
    -- codice che NESSUNO ha registrato come annullato: l'invio tardivo avrebbe
    -- potuto ancora scrivere, e «Non risulta salvata» non sarebbe stato
    -- definitivo. Per §4.4 un «Controlla» che solleva dà «Non so», che qui è la
    -- risposta vera. Misurato il 27/09/2026: togliere il coalesce non fa
    -- arrossire niente (0 rosse su 393), quindi era un mascheratore puro.
    -- ⚠︎ In `read committed` questo ramo non è raggiungibile: l'unico
    -- cancellatore è la pulizia a 30 giorni di `app.chiudi_invio`, e §4.4 butta
    -- i codici a 24 ore. Lo è in `repeatable read`, dove la variante con
    -- `exception when unique_violation` restituisce `null` (misurato).
    raise exception 'invio % sparito fra inserimento e lettura', p_codice
      using errcode = 'P0003';
  end if;
  return v_esito;
end
$$;

create function public.controlla_invio(p_codice uuid, p_visita uuid) returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_esito      text;
  v_stato      jsonb;
  v_cancellata boolean;
  v_riga       integer;
begin
  if not (select app.is_active_operator()) then
    raise exception 'controlla_invio: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  v_esito := app.apri_invio_come_annullato(p_codice);

  -- Istruzione SEPARATA dalla registrazione: qui la fotografia è nuova.
  --
  -- ⚠︎ È IL VINCOLO di §4.4 (revisione 15), scritto per esteso nel commento di
  -- testa di `0016_salva_visita.sql`, che consegna `stato_visita` a
  -- «Controlla»: `public.stato_visita` è `stable`, e una funzione `stable`
  -- prende la sua fotografia all'inizio dell'ISTRUZIONE che la chiama, non
  -- della transazione. In un'istruzione successiva vede il commit dell'invio
  -- che ha appena atteso; nella stessa istruzione dell'`insert into invio`, o
  -- in una CTE con esso, no. Chi accorpa queste righe rompe la (b).
  -- ⚠︎ `0017_sposta_e_cancella.sql` la chiama due volte SENZA questa riga: la
  -- sua forma è corretta per accidente, quindi non si copia da là.
  v_stato := public.stato_visita(p_visita);
  select true into v_cancellata from public.visita_cancellata vc where vc.id = p_visita;
  v_cancellata := coalesce(v_cancellata, false);

  if v_esito = 'annullato' then
    v_riga := 1;
  elsif v_esito = 'salvata' then
    if v_stato is not null then
      v_riga := 2;            -- l'app distingue 2 da 3 confrontando con la scheda
    elsif v_cancellata then
      v_riga := 4;
    else
      v_riga := 5;            -- non deve accadere: ogni cancellazione passa dalla tabella
    end if;
  elsif v_esito = 'non_trovata' then
    -- ⚠︎ AGGIUNTO il 27/09/2026 (spec §4.4, revisione 19). Senza questo ramo
    -- `non_trovata` cadeva nell'`else`, cioè riga 6, e §4.1 dà a quell'esito il
    -- messaggio «account chiuso, OPPURE questa visita non esiste più».
    -- Misurato: tutte e tre le funzioni di scrittura registrano `non_trovata`
    -- anche quando la visita C'È e è caduto solo il permesso di leggerla, quindi
    -- con l'account riattivato entro le 24 ore la riga 6 avrebbe affermato
    -- l'assenza di una visita presente. Vince la prima regola comune di §4.4:
    -- «Dove sta la visita lo dice la lettura, mai la memoria del telefono» — e
    -- qui la lettura ce l'abbiamo in mano.
    if v_stato is not null then
      v_riga := 1;            -- «Non risulta salvata»: vero, `non_trovata` non scrive
    elsif v_cancellata then
      v_riga := 4;
    else
      v_riga := 5;
    end if;
  elsif v_esito = 'cancellata' then
    -- ⚠︎ CORRETTO il 27/09/2026 (spec revisione 18). Qui c'era
    -- `elsif v_esito in ('cancellata','gia_cancellata') then v_riga := 2;`,
    -- e la riga 2 è «✓ Risulta salvata»: una cancellazione riuscita avrebbe
    -- detto all'operatrice che la visita è SALVATA, e un `gia_cancellata` pure.
    -- §4.4 dà ora a `cancellata` la riga 7 («✓ Risulta cancellata», l'analoga
    -- della 2 per «Elimina visita») e lascia `gia_cancellata` alla riga 6, che
    -- è letteralmente il suo caso: un esito che non ha scritto.
    v_riga := 7;
  else
    v_riga := 6;            -- compreso `gia_cancellata` (§4.4, revisione 18)
  end if;

  -- Il ricontrollo dell'account anche DOPO la lettura: se la sessione è stata
  -- chiusa nel frattempo, la riga del codice e la visita sono invisibili e la
  -- risposta sarebbe un falso «non risulta».
  if not (select app.is_active_operator()) then
    raise exception 'controlla_invio: sessione chiusa durante la lettura' using errcode = '42501';
  end if;

  return jsonb_build_object('riga', v_riga, 'esito_invio', v_esito, 'stato', v_stato);
end
$$;

-- ⚠︎ NOTA SU `v_cancellata`, per chi arriva da `0016` e `0017`: là il
-- `case when v_cancellata then … else 'non_trovata' end` dentro il ramo
-- `v_stato is null` è CODICE MORTO, dichiarato tale il 27/09/2026 dopo cinque
-- mutazioni che danno 0 rosse su 375 — compreso scambiare i due letterali fra
-- le funzioni gemelle. Non c'è porta: là la visita è sotto `for update`, quindi
-- `v_stato is null` significa soltanto «permesso caduto», e sotto lo stesso
-- blackout `visita_cancellata` si legge con la stessa politica di `visit` ed è
-- falsa anche quando la riga c'è.
--
-- QUI è diverso, ed è la differenza che non va persa copiando il ragionamento:
-- `controlla_invio` legge SENZA bloccare. Quindi `v_stato is null` ha due cause
-- vere e distinte — visita davvero cancellata e visita mai esistita — e
-- `v_cancellata` è ciò che le separa: è la riga 4 contro la riga 5. Il ramo è
-- raggiungibile, e la prova «riga 4: la visita è stata cancellata dopo il
-- salvataggio» lo esercita — ⚠︎ ma SOLO nel ramo `salvata`. Il sotto-ramo
-- gemello del ramo `non_trovata` (riga 96) NON era presidiato: misurato il
-- 27/09/2026, portarlo a 7 dava 0 rosse su 393. Ora ha la sua prova, e così la
-- riga 5, che nessuna delle 393 prove produceva. Due di quelle mutazioni morte
-- altrove sono letali qui:
-- `cancellata` è la riga 7 e `salvata` la riga 2, cioè un ✓ per un invio che
-- non ha scritto una riga.

revoke execute on function
  public.controlla_invio(uuid, uuid),
  app.apri_invio_come_annullato(uuid)
from public, anon;

grant execute on function
  public.controlla_invio(uuid, uuid),
  app.apri_invio_come_annullato(uuid)
to authenticated;
