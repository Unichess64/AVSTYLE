-- The privilege baseline for the whole application schema. Spec §6.4 fixed
-- this hole on appointment_slot alone (0005_occupancy.sql); a re-review
-- measured the same hole open on every OTHER table Supabase creates in
-- public, because Supabase's default ACL grants anon and authenticated the
-- full rDxtm set (references, delete, insert, select, trigger, truncate,
-- update, maintain) on every table, and row-level security does NOT apply
-- to TRUNCATE — RLS only gates SELECT/INSERT/UPDATE/DELETE.
--
-- Measured live, before this migration existed:
--   truncate table client;      -- as anon: succeeded. The only personal
--                                -- data in the system, gone.
--   truncate table appointment; -- as anon: succeeded. The same
--                                -- double-booking vector 0005 closed on
--                                -- appointment_slot, reachable one join
--                                -- away by truncating its parent instead.
--
-- This migration is 00051, not 0006: 0006 is already claimed by a later
-- task for availability. Supabase applies migrations in lexicographic
-- filename order, so a "0005b_" prefix was the first name tried — but the
-- Supabase CLI's migration-filename pattern requires the leading run to be
-- digits only (verified live: db reset silently SKIPPED a "0005b_"-prefixed
-- file with no error, which would have shipped this fix inert while
-- reporting success). "00051_" is digits-only, so the CLI accepts it, and
-- it still sorts after "0005_" and before "0006_" (confirmed against a
-- throwaway 0006 test file, then removed): "0005" < "00051" < "0006" as
-- both strings and as the CLI's own applied order.
--
-- appointment_slot is deliberately NOT touched here — 0005_occupancy.sql
-- already revokes everything but SELECT from both roles there, which is
-- stricter than the baseline below and stays correct as-is.

-- Part 1: revoke truncate, references, trigger from BOTH anon and
-- authenticated, on every other application table. None of the three is
-- ever used by the application; TRUNCATE in particular bypasses RLS
-- entirely, so leaving it grantable reopens exactly the hole this migration
-- exists to close, on whichever table a caller picks.
revoke truncate, references, trigger on operator from authenticated, anon;
revoke truncate, references, trigger on service_category from authenticated, anon;
revoke truncate, references, trigger on service from authenticated, anon;
revoke truncate, references, trigger on operator_service from authenticated, anon;
revoke truncate, references, trigger on salon_settings from authenticated, anon;
revoke truncate, references, trigger on client from authenticated, anon;
revoke truncate, references, trigger on visit from authenticated, anon;
revoke truncate, references, trigger on appointment from authenticated, anon;

-- Part 2: revoke insert, update, delete from anon ONLY, keeping SELECT.
-- anon can never satisfy app.is_active_operator() (it has no operator
-- identity to match), so this removes nothing the application uses for
-- unauthenticated callers — it is defence in depth: a future policy
-- mistake (e.g. a permissive USING clause added to the wrong role) cannot
-- be exploited by anon if the grant itself is absent underneath it.
--
-- SELECT is deliberately KEPT for anon: several existing tests assert that
-- an anonymous visitor sees zero rows (RLS filters them out), not a
-- permission error. Revoking SELECT would turn that "0 rows" into a
-- "42501 permission denied" and break those tests while changing nothing
-- about what data anon can actually read (RLS already returns zero rows).
--
-- authenticated keeps insert, update, delete on all of these tables: the
-- application needs them, and row-level security is what arbitrates them.
revoke insert, update, delete on operator from anon;
revoke insert, update, delete on service_category from anon;
revoke insert, update, delete on service from anon;
revoke insert, update, delete on operator_service from anon;
revoke insert, update, delete on salon_settings from anon;
revoke insert, update, delete on client from anon;
revoke insert, update, delete on visit from anon;
revoke insert, update, delete on appointment from anon;
