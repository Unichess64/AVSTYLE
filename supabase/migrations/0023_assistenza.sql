-- 0023 — L'accesso di assistenza: un'operatrice che entra nell'app ma non lavora.
--
-- Chi segue l'app per il salone deve poter entrare per correggere qualcosa
-- anche quando ognuna delle tre ha il proprio account (richiesta dell'utente
-- del 08/10). Ogni account appartiene a una riga di `operator`, quindi
-- l'accesso è una riga in più, attiva, che non compare in agenda né fra chi
-- esegue i servizi. È attiva e collegata: la guardia di 0009 la conta, e va
-- bene così — finché c'è l'assistenza il salone non resta chiuso fuori.
alter table public.operator add column in_agenda boolean not null default true;

insert into public.operator (name, color, is_active, sort_order, in_agenda)
values ('Assistenza', '#E6E1E8', true, 99, false);
