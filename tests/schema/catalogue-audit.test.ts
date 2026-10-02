import { describe, expect, it } from 'vitest'
import { asOwner } from '../helpers/db'

// ─── Gli elenchi nominativi dell'audit (Task 9) ────────────────────────────
//
// Un audit che cerca «nessuna» non si accorge di una funzione NUOVA: la prima
// che nasce sbagliata entra nell'insieme e l'insieme resta vuoto solo finché
// qualcuno non sbaglia. Questi elenchi dichiarano l'insieme ATTESO, voce per
// voce, ciascuna con la ragione per cui ci sta. Una voce in più o in meno fa
// arrossire, ed è il punto: il rimedio a una rossa NON è allargare l'elenco,
// è capire perché una funzione ci è finita.

// L'insieme delle funzioni eseguibili da anon deve essere ESATTAMENTE questo.
// Non «nessuna»: sei funzioni di trigger dello schema app e immutable_unaccent
// lo sono da prima di questo piano, e l'elenco le dichiara con la loro ragione.
const ESEGUIBILI_DA_ANON = [
  'app.delete_orphan_visit()',
  'app.guard_operator_lockout()',
  'app.is_active_operator()',
  'app.sync_appointment_slots()',
  'app.touch_client_activity()',
  'app.touch_updated_at()',
  'public.immutable_unaccent(text)',
]

// Le funzioni security definer che NON sono trigger e che authenticated può
// chiamare: ognuna deve avere la guardia sul predicato, e una prova che ne
// misura l'EFFETTO da un account chiuso.
//
// ⚠︎ app.chiudi_sessioni_di(uuid) è definer e NON è qui, correttamente: sta in
// schema app, dove il `revoke … from public` di 0015 toglie anche l'EXECUTE
// implicito che PostgreSQL dà a PUBLIC (misurato al Task 7: togliere il solo
// grant ad authenticated su una funzione di `app` dà 19 rosse — in `app` i
// default di Supabase non arrivano, e la misura di `public` non si riusa).
const DEFINER_PER_AUTHENTICATED = [
  'app.apri_invio(p_codice uuid)',
  'app.apri_invio_come_annullato(p_codice uuid)',
  'app.chiudi_invio(p_codice uuid, p_esito text)',
  'app.is_active_operator()',
  'public.chiudi_sessioni(p_operator_id uuid)',
  'public.list_auth_accounts()',
]

// L'elenco NOMINATIVO di tutte le security definer, trigger compresi — cioè
// `where prosecdef` SENZA il filtro `prorettype <> 'trigger'`.
//
// Perché è un elenco diverso e più largo di DEFINER_PER_AUTHENTICATED (sei):
// quello enumera le chiamabili da authenticated, questo enumera chi il potere
// ce l'ha. Misurato il 30/09/2026: sono QUATTORDICI, e otto di esse non sono
// nell'elenco delle sei.
//
// ⚠︎ QUANTE NE PRESIDIA DAVVERO QUESTA PROVA DA SOLA: TRE, non otto. La prima
// stesura di questo commento diceva otto ed era FALSA. Misurato il 30/09/2026
// portando a `security invoker` tutte e otto, una per una, con la suite intera
// a ogni giro (438 prove):
//
//   app.chiudi_sessioni_di(uuid)          1 rossa  → SOLO questa prova
//   app.delete_orphan_visit()             1 rossa  → SOLO questa prova
//   app.touch_client_activity()           1 rossa  → SOLO questa prova
//   app.chiudi_sessioni_operatrice()      2 rosse
//   app.guard_operator_lockout()          6 rosse
//   app.registra_visita_cancellata()     13 rosse
//   app.annuncia_giorni()                90 rosse
//   app.sync_appointment_slots()         90 rosse
//
// Quindi il valore di questa prova è reale ma circoscritto: per TRE funzioni è
// l'unico rivelatore che esista, per le altre cinque è il primo a parlare.
//
// ⚠︎ E la seconda metà di quel commento era falsa allo stesso modo. Diceva che
// senza il `definer` di `app.registra_visita_cancellata` ogni «Elimina visita»
// fallirebbe «con la suite tutta verde»: **no**, dà 13 rosse su 5 file, di cui
// 12 comportamentali (`cancella_visita`, `le sette righe`, `registro delle
// visite cancellate`, la gemella positiva di `outsider-write`). Il bloccante
// della revisione del Task 1 era vero ALLORA, quando quelle 12 prove non
// esistevano: i Task 6, 7 e 8 lo hanno chiuso per altra via. Un `create or
// replace function` azzera comunque ogni attributo non ripetuto, ed è la forma
// che il Task 8 ha usato su `chiudi_invio`: la prova resta utile, ma chi legge
// non le attribuisca un merito che è di altri.
//
// ⚠︎ Due di queste funzioni esistono in DUE sedi, e chi muta la migrazione
// sbagliata misura il nulla: `app.is_active_operator()` è definita in 0001:27
// e RIDEFINITA in 0014:23; `app.chiudi_invio` in 0013:126 e 0019:179. La sede
// viva è sempre la seconda.
const DEFINER_DICHIARATE: [string, string][] = [
  ['app.annuncia_giorni()', 'trigger: scrive in annuncio, dove authenticated non ha INSERT (0019)'],
  ['app.apri_invio(p_codice uuid)', 'registra il codice in invio, dove authenticated ha la sola SELECT (0013:99)'],
  ['app.apri_invio_come_annullato(p_codice uuid)', 'gemella della precedente per il ramo annullato (0018:29)'],
  ['app.chiudi_invio(p_codice uuid, p_esito text)', "registra l'esito in invio (0013:126, sede viva 0019:179)"],
  ['app.chiudi_sessioni_di(p_auth_user_id uuid)', 'cancella da auth.sessions, che è di supabase_auth_admin (0015)'],
  ['app.chiudi_sessioni_operatrice()', 'trigger: stessa ragione, sul cambio di is_active/auth_user_id (0015)'],
  ['app.delete_orphan_visit()', 'trigger (0008): definer DIFENSIVO, non necessario — authenticated ha già DELETE su visit; copre il caso in cui il trigger scatti quando la sessione è già caduta. Misurato: a invoker, 1 rossa e solo questa prova'],
  ['app.guard_operator_lockout()', "trigger di vincolo: conta le operatrici attive scavalcando la RLS (0009)"],
  ['app.is_active_operator()', 'legge operator e auth.sessions: è il predicato di ogni politica (0001:27, sede viva 0014:23)'],
  ['app.registra_visita_cancellata()', 'trigger: scrive in visita_cancellata (0013) — il definer perduto era il bloccante del Task 1'],
  ['app.sync_appointment_slots()', 'trigger: scrive appointment_slot, dove authenticated ha la sola SELECT (0005)'],
  ['app.touch_client_activity()', 'trigger differito (0007): definer DIFENSIVO, non necessario — authenticated ha già UPDATE su client; il trigger scatta al COMMIT, quando la sessione può essere già caduta. Misurato: a invoker, 1 rossa e solo questa prova'],
  ['public.chiudi_sessioni(p_operator_id uuid)', 'il pulsante del 3c: passa da app.chiudi_sessioni_di (0015)'],
  ['public.list_auth_accounts()', "legge auth.users per l'elenco dei conti (0011)"],
]

// Postgres scrive un search_path vuoto come `search_path=""`, non come
// `search_path=` (lo dice già la prova «pins search_path…» qui sotto). E
// app.touch_updated_at (0004) non ha proconfig affatto: è un trigger invoker
// che tocca solo NEW, e resta dichiarato qui invece di essere nascosto
// allargando la prova.
//
// ⚠︎ Il secondo letterale accettato, `search_path=public, pg_catalog`, è la
// forma in cui Postgres normalizza il proconfig delle quattro funzioni di
// 0010. È stato LETTO dal catalogo, non assunto (30/09/2026): se non
// coincidesse — uno spazio, una virgoletta, l'ordine — questa prova
// arrossirebbe con quattro voci di troppo e la tesi «mancano il search_path»
// sarebbe falsa.
const SENZA_SEARCH_PATH_DICHIARATE = ['touch_updated_at']

// La forma che ogni politica di public deve avere, AL CARATTERE.
//
// La prova sorella «routes every policy through app.is_active_operator()» usa
// `not like '%is_active_operator%'`, cioè una sottostringa, ed è quindi cieca a
// `(select app.is_active_operator()) or true`: spalancando salon_closure_access
// l'audit resta verde e arrossisce UNA SOLA prova di comportamento (reperto
// S4-6). L'uguaglianza esatta chiude quel buco.
//
// I tre numeri sono misurati il 30/09/2026, non assunti: 16 politiche, 28
// espressioni non nulle fra polqual e polwithcheck, e UNA SOLA forma distinta.
//
// ⚠︎ Si asseriscono tutti e tre, e ciascuno chiude un caso che gli altri due
// non vedono. Misurato: una politica `for delete` senza `using` ha polqual E
// polwithcheck nulli, quindi non porta nessuna espressione — le 28 restano 28
// e la sola asserzione capace di vederla è il conteggio delle POLITICHE (17).
// Simmetricamente, una politica che perde il predicato lasciando invariato il
// conteggio è vista solo dalle 28.
const FORMA_DELLE_POLITICHE = '( SELECT app.is_active_operator() AS is_active_operator)'
const POLITICHE_ATTESE = 16
const ESPRESSIONI_ATTESE = 28

// Gli schemi esposti a PostgREST. È l'UNICO vero presidio dietro
// l'irraggiungibilità delle funzioni dello schema `app`, e fino al Task 9 non
// lo piantava niente: misurato, in tutto `tests/` la parola `schemas` non
// compariva nemmeno una volta.
//
// Danno misurato se cadesse (appendice del Task 1, punto 4): un account
// estraneo con sessione authenticated eseguirebbe `app.apri_invio` e
// BRUCEREBBE IL CODICE D'INVIO DI UN'ALTRA — e tutta §4.4 poggia sul fatto che
// un codice bruciato non si possa più usare. Lo stesso vale per
// `app.chiudi_sessioni_di`, che scavalca le tre guardie di public.chiudi_sessioni.
const SCHEMI_ESPOSTI = '["public", "graphql_public"]'

// I trigger applicativi (non interni) di `public`, contati sul CATALOGO, che è
// la sede che la prova interroga. ⚠︎ Un `grep 'create trigger'` sulle
// migrazioni ne dà 14, e il 14 è falso: perde le tre `create constraint
// trigger` (zz_touch_client_activity ×2 in 0007, operator_lockout_guard in
// 0009:97). Se il numero non torna, NON abbassarlo: si è trovato qualcosa.
const TRIGGER_ATTESI = 17

// Le viste e le viste materializzate di `public`: oggi NESSUNA, e la prova lo
// pianta come insieme vuoto invece che ignorarle.
//
// ⚠︎ Non è zelo. Misurato il 30/09/2026: `create view public.doppioni_cliente
// as select id, full_name, phone from public.client` — SENZA scrivere un solo
// `grant` — nasce con ACL `anon=arwdDxtm/postgres` per i default di Supabase,
// e da `anon` restituisce nome e telefono IN CHIARO delle clienti (2 righe su
// 2), mentre la stessa `anon` legge ZERO righe da `public.client` perché la
// sicurezza per riga morde. La suite resta a 438 VERDI: le quattro prove di
// tabella qui sopra filtrano tutte `c.relkind = 'r'`, e `pg_policy` non
// contiene viste. Identico con una vista materializzata (`relkind = 'm'`).
//
// E `public` è esposto a PostgREST (vedi SCHEMI_ESPOSTI), quindi quella vista
// sarebbe servita su /rest/v1/ a chiunque abbia la chiave pubblica.
//
// Il Task 10 progetta `cerca_clienti` e `doppioni_cliente` come FUNZIONI
// (`returns table`, invoker, search_path vuoto). Se una di esse diventasse una
// vista, questa è l'unica prova del repo che se ne accorgerebbe.
const VISTE_DICHIARATE: string[] = []

describe('catalogue audit', () => {
  it('has row-level security enabled on every table in public', async () => {
    const rows = await asOwner(async (c) => {
      const r = await c.query<{ t: string }>(`
        select c.relname as t from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
        order by 1
      `)
      return r.rows.map((x) => x.t)
    })
    expect(rows).toEqual([])
  })

  it('has at least one policy on every table in public', async () => {
    const rows = await asOwner(async (c) => {
      const r = await c.query<{ t: string }>(`
        select c.relname as t from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
        order by 1
      `)
      return r.rows.map((x) => x.t)
    })
    expect(rows).toEqual([])
  })

  // Without this, a future `using (true)` policy satisfies the test above.
  // Both USING and WITH CHECK are checked: Postgres does not allow USING on an
  // INSERT policy, so `for insert with check (...)` is a real shape, and a
  // policy that only sets WITH CHECK must still route through the predicate.
  // polqual/polwithcheck are NULL when the corresponding clause is absent, and
  // `pg_get_expr(NULL, ...)` returns NULL too, so each side is coalesced to
  // '' first — otherwise `NULL not like '...'` is NULL, which WHERE treats as
  // false and the row silently disappears from the audit.
  // ⚠︎ Task 9: questa prova RESTA, ed è una scelta dichiarata, non una svista.
  // La sorella nuova «dà a ogni politica di public esattamente la forma
  // dichiarata, e sono sedici» è strettamente più forte, e misurando caso per
  // caso questa non sa mordere dove quella non morda già:
  //   • predicato allargato con `or true` → la nuova arrossisce, questa no;
  //   • politica in più con `using (true)` → arrossiscono tutte e due;
  //   • politica `for delete` senza `using` (polqual e polwithcheck nulli) →
  //     questa arrossisce, e la nuova pure, ma solo grazie al conteggio delle
  //     politiche (17 invece di 16), non alla forma: misurato il 30/09/2026.
  // Resta perché costa nulla ed è il pavimento che sopravvive se un giorno
  // qualcuno allentasse l'uguaglianza esatta davanti a una politica nuova e
  // legittima con un predicato diverso. Chi la togliesse tolga anche quel
  // pavimento con gli occhi aperti.
  it('routes every policy through app.is_active_operator()', async () => {
    const rogue = await asOwner(async (c) => {
      const r = await c.query<{ t: string; p: string }>(`
        select c.relname as t, p.polname as p
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%is_active_operator%'
          and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%is_active_operator%'
        order by 1, 2
      `)
      return r.rows
    })
    expect(rogue).toEqual([])
  })

  // §4.3 calls `set search_path = ''` "mandatory and not decoration ... the
  // textbook privilege-escalation route". This is the guard for that claim.
  // The value must be EMPTY, not merely present: `search_path=public` would
  // match a substring check just as happily as `search_path=`, but only the
  // empty value forces every reference to be schema-qualified. `proconfig` is
  // unnested so each `key=value` entry can be compared exactly, rather than
  // substring-matching the whole array. Postgres unparses an empty search_path
  // as `search_path=""` (a quoted empty identifier), not a bare trailing `=`,
  // so the value half is unquoted before the emptiness check.
  it('pins search_path on every security definer function', async () => {
    const unpinned = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select p.proname as f
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and p.prosecdef
          and not exists (
            select 1 from unnest(p.proconfig) cfg
            where split_part(cfg, '=', 1) = 'search_path'
              and trim(both '"' from split_part(cfg, '=', 2)) = ''
          )
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(unpinned).toEqual([])
  })

  // Guards against a double booking that RLS cannot see coming: TRUNCATE is
  // not gated by row-level security, and Supabase's default ACL grants it to
  // authenticated and anon. An operator who can truncate appointment_slot can
  // wipe every occupied cell and then insert a clashing appointment with
  // nothing left for the deferred unique constraint to collide against — a
  // committed double booking (task 7, finding 1). This audit reads the
  // catalogue directly, rather than re-deriving the privilege list from the
  // migration, so a future migration that widens the grant (or a new write
  // privilege Postgres adds) is caught here instead of being demonstrated
  // again by a reviewer.
  //
  // Both audits below read `pg_class.relacl` through `aclexplode`, joined to
  // `pg_roles` for the grantee name, rather than
  // `information_schema.role_table_grants` as an earlier version did.
  // Measured reason: MAINTAIN is a real, grantable table privilege (it backs
  // LOCK/VACUUM/ANALYZE/CLUSTER/REINDEX, none of it gated by row-level
  // security — RLS only gates SELECT/INSERT/UPDATE/DELETE), but
  // `information_schema.role_table_grants`'s privilege vocabulary predates
  // MAINTAIN and simply has no row for it — an audit built on that view is
  // structurally blind to it, passing green while `anon` held it on every
  // table. `aclexplode(pg_class.relacl)` decodes the ACL Postgres actually
  // stores and lists every privilege it contains, MAINTAIN included, so a
  // future privilege this same way is caught here rather than demonstrated
  // again by a reviewer.
  //
  // A re-review measured a second, narrower gap in that same rewrite: both
  // queries joined `pg_roles` on `r.oid = a.grantee` with an INNER join. A
  // `grant ... to public` is stored by Postgres as an aclitem whose grantee
  // OID is 0, and OID 0 has no row in `pg_roles` — an INNER join drops that
  // aclitem before either query ever sees it. Measured live: `grant maintain
  // on client to public` followed by `lock table client in access exclusive
  // mode` as `anon` succeeded with both audits below still green, and `grant
  // truncate, insert on weekly_availability to public` followed by
  // `truncate table weekly_availability` as `anon` succeeded the same way.
  // `PUBLIC` is not a corner case here — it is the grant shape a future
  // migration is most likely to add by accident (a bare `grant ... on t to
  // public`, no role list), and it is exactly the shape an inner join on
  // `pg_roles` hides. Both queries below now `left join pg_roles` and read
  // the grantee as `coalesce(r.rolname, 'PUBLIC')`, and — because a grant to
  // PUBLIC is effectively a grant to every role including `anon` and
  // `authenticated` — both queries fold a PUBLIC row into the same buckets
  // those two roles are checked against, rather than adding a third bucket
  // neither assertion looks at.
  it('grants authenticated and anon nothing but SELECT on appointment_slot', async () => {
    const rows = await asOwner(async (c) => {
      const r = await c.query<{ grantee: string; privilege_type: string }>(`
        select coalesce(r.rolname, 'PUBLIC') as grantee, a.privilege_type
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral aclexplode(c.relacl) a
        left join pg_roles r on r.oid = a.grantee
        where n.nspname = 'public'
          and c.relname = 'appointment_slot'
          and coalesce(r.rolname, 'PUBLIC') in ('authenticated', 'anon', 'PUBLIC')
        order by 1, 2
      `)
      return r.rows
    })
    // A PUBLIC grant applies to authenticated and anon alike, so it is
    // folded into both buckets rather than checked as a third, unread one.
    const byRole = (role: string) =>
      rows
        .filter((r) => r.grantee === role || r.grantee === 'PUBLIC')
        .map((r) => r.privilege_type)
    expect(byRole('authenticated')).toEqual(['SELECT'])
    expect(byRole('anon')).toEqual(['SELECT'])
  })

  // A re-review measured the appointment_slot audit above sees nothing
  // beyond that one table: Supabase's default ACL grants anon and
  // authenticated the full rDxtm set (references, delete, insert, select,
  // trigger, truncate, update, maintain) on EVERY table it creates in
  // public, and RLS does not gate TRUNCATE or MAINTAIN at all. Measured live
  // before the 0005b baseline migration existed: `truncate table client;` as
  // anon succeeded (wiping the only personal data in the system), and so did
  // `truncate table appointment;` (the same double-booking vector 0005
  // closed on appointment_slot, reached one join away by truncating its
  // parent instead). A later re-review measured MAINTAIN itself missing from
  // this same list: as anon, `lock table client in access exclusive mode`
  // and `analyze client` both succeeded, letting an unauthenticated caller
  // block every reader of the database — and the version of this audit that
  // read `information_schema.role_table_grants` could not have caught it,
  // because that view has no MAINTAIN row to find (see the comment above).
  // This audit enumerates every table and every privilege in the catalogue —
  // via `aclexplode(pg_class.relacl)`, not a hardcoded list and not a view
  // with a gap in its vocabulary — so a future table, or a future privilege
  // Postgres adds, that forgets the baseline grant is caught here instead of
  // being demonstrated again by a reviewer.
  //
  // Like the audit above, this one now `left join`s `pg_roles` and reads the
  // grantee as `coalesce(r.rolname, 'PUBLIC')`, folding a PUBLIC grant into
  // the same `anon`/`authenticated` checks rather than letting the INNER
  // join drop it: see the shared comment above this audit's sibling for the
  // measured PUBLIC-grant blind spot this closes.
  it('grants no table truncate, references or trigger to anon/authenticated, and no insert/update/delete to anon', async () => {
    const offenders = await asOwner(async (c) => {
      const r = await c.query<{ o: string }>(`
        select c.relname || ': ' || a.privilege_type as o
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral aclexplode(c.relacl) a
        left join pg_roles r on r.oid = a.grantee
        where n.nspname = 'public'
          and c.relkind = 'r'
          and (
            (coalesce(r.rolname, 'PUBLIC') in ('anon', 'authenticated', 'PUBLIC')
              and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'))
            or
            (coalesce(r.rolname, 'PUBLIC') in ('anon', 'PUBLIC')
              and a.privilege_type in ('INSERT', 'UPDATE', 'DELETE'))
          )
        order by 1
      `)
      return r.rows.map((x) => x.o)
    })
    expect(offenders).toEqual([])
  })

  it('does not force row-level security on operator', async () => {
    // Cheap insurance. Note the spec's corrected reasoning: with the superuser
    // owner Supabase uses, FORCE is inert; with a nobypassrls owner it raises
    // 54001, not 42P17.
    const forced = await asOwner(async (c) => {
      const r = await c.query<{ f: boolean }>(
        `select relforcerowsecurity as f from pg_class where relname = 'operator'`,
      )
      return r.rows[0].f
    })
    expect(forced).toBe(false)
  })

  // ─── Task 9: gli elenchi nominativi ─────────────────────────────────────

  it('lascia eseguibili da anon esattamente le funzioni dichiarate', async () => {
    const trovate = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select n.nspname || '.' || p.proname || '(' ||
               pg_get_function_arguments(p.oid) || ')' as f
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and has_function_privilege('anon', p.oid, 'EXECUTE')
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(trovate).toEqual(ESEGUIBILI_DA_ANON)
  })

  it('ha esattamente queste funzioni security definer chiamabili da authenticated', async () => {
    const trovate = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select n.nspname || '.' || p.proname || '(' || pg_get_function_arguments(p.oid) || ')' as f
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and p.prosecdef
          and p.prorettype <> 'trigger'::regtype
          and has_function_privilege('authenticated', p.oid, 'EXECUTE')
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(trovate).toEqual(DEFINER_PER_AUTHENTICATED)
  })

  // Passo 1-bis, dall'appendice del Task 1 punto 5: il filtro `where prosecdef`
  // della prova «pins search_path…» qui sopra non è un elenco, è un insieme
  // aperto. Questa prova lo chiude per nome, TRIGGER COMPRESI — che sono
  // proprio le otto che DEFINER_PER_AUTHENTICATED non vede.
  it('ha esattamente queste funzioni security definer, trigger compresi', async () => {
    const trovate = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select n.nspname || '.' || p.proname || '(' || pg_get_function_arguments(p.oid) || ')' as f
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and p.prosecdef
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(trovate).toEqual(DEFINER_DICHIARATE.map(([f]) => f))
  })

  it('non lascia nessuna funzione nuova senza search_path vuoto', async () => {
    const senza = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select p.proname as f
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and not exists (
            select 1 from unnest(coalesce(p.proconfig, '{}')) s
            where s = 'search_path=""' or s = 'search_path=public, pg_catalog'
          )
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(senza).toEqual(SENZA_SEARCH_PATH_DICHIARATE)
  })

  // Il piano fissa `read committed` per tutte le funzioni. Una che imponesse il
  // proprio livello sarebbe invisibile a ogni prova di comportamento e
  // cambierebbe di nascosto la semantica della concorrenza: la variante
  // `exception when unique_violation` di app.apri_invio_come_annullato, che in
  // `read committed` è indistinguibile dalla forma vera (misurato al Task 7,
  // sonda 5, zero rosse), in `repeatable read` restituisce `null` in silenzio —
  // e il chiamante lo tratterebbe come `annullato`, cioè RIGA 1 PER UN INVIO
  // CHE HA SALVATO. Questa prova è l'unica cosa che tiene in piedi quella riga.
  it('non lascia nessuna funzione a imporre un livello di isolamento proprio', async () => {
    const strane = await asOwner(async (c) => {
      const r = await c.query<{ f: string }>(`
        select p.proname as f
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and exists (
            select 1 from unnest(coalesce(p.proconfig, '{}')) s
            where s like 'default_transaction_isolation=%'
          )
        order by 1
      `)
      return r.rows.map((x) => x.f)
    })
    expect(strane).toEqual([])
  })

  // ⚠︎ Il Passo 1 del piano prescriveva QUI una prova «non lascia ad anon o
  // authenticated TRUNCATE o MAINTAIN sulle tabelle nuove». NON è stata
  // aggiunta, e la ragione è misurata, non di gusto.
  //
  // È un doppione strettamente PIÙ DEBOLE della prova «grants no table
  // truncate, references or trigger…» qui sopra, che copre TRUNCATE,
  // REFERENCES, TRIGGER e MAINTAIN su tutte le tabelle per anon,
  // authenticated E PUBLIC. La forma del piano filtra su
  // `a.grantee::regrole::text in ('anon','authenticated')`, e un
  // `grant … to public` è memorizzato con grantee OID 0, che non è né l'uno né
  // l'altro. ⚠︎ Il rimedio che viene in mente per primo non ripara niente:
  // `0::regrole::text` vale `'-'`, NON `'PUBLIC'` (misurato).
  //
  // Le due sonde che lo dimostrano, eseguite il 30/09/2026:
  //   • `grant truncate on annuncio to anon`   → la prova esistente dà 1 rossa,
  //     e la forma del piano vedrebbe la stessa riga: SUSSUNTA.
  //   • `grant truncate on annuncio to public` → la prova esistente dà 1 rossa;
  //     la forma del piano restituisce `[]` e resterebbe VERDE.
  // Aggiungerla sarebbe stato un secondo audit che sembra presidiare e non
  // presidia la forma di grant più probabile: un `grant … to t to public` senza
  // elenco di ruoli.

  it('pubblica esattamente la tabella degli annunci, e solo gli inserimenti', async () => {
    const stato = await asOwner(async (c) => {
      const t = await c.query<{ t: string }>(
        "select tablename as t from pg_publication_tables where pubname = 'supabase_realtime' order by 1",
      )
      const p = await c.query<{ i: boolean; u: boolean; d: boolean }>(
        "select pubinsert as i, pubupdate as u, pubdelete as d from pg_publication where pubname = 'supabase_realtime'",
      )
      return { tabelle: t.rows.map((x) => x.t), ...p.rows[0] }
    })
    expect(stato).toEqual({ tabelle: ['annuncio'], i: true, u: false, d: false })
  })

  // Un trigger spento non fa rumore: un `disable` dimenticato, o un guasto a
  // metà migrazione, toglierebbe un presidio senza che nessuno se ne accorga.
  //
  // ⚠︎ La soglia si misura sul CATALOGO, che è la sede che la prova interroga:
  // i trigger non interni di public sono 17 (30/09/2026). Un
  // `grep 'create trigger'` sulle migrazioni ne dà 14, e il 14 è falso —
  // perde le tre `create constraint trigger` (zz_touch_client_activity ×2 in
  // 0007, operator_lockout_guard in 0009:97). Chi ne contasse meno di 11 NON
  // abbassi la soglia: ha trovato qualcosa di vero.
  // ⚠︎ Il conteggio è ESATTO, non `toBeGreaterThan(10)` come lo scriveva il
  // piano. Misurato il 30/09/2026: con la soglia, `drop trigger visit_touch on
  // public.visit` porta i trigger da 17 a 16 e questa prova resta VERDE —
  // arrossiscono 3 prove di comportamento altrove, ma l'audit, che è la cosa
  // che dovrebbe accorgersi di un presidio sparito, non se ne accorge. Un
  // trigger CANCELLATO è almeno tanto probabile quanto uno spento, e lo stesso
  // `disable` dimenticato che questa prova cerca nasce spesso da un `drop` e
  // `create` a metà.
  //
  // Il prezzo è dichiarato: chi aggiunge un trigger applicativo a `public` deve
  // passare di qui e alzare il numero. È lo stesso attrito, voluto, degli
  // elenchi nominativi qui sopra.
  it('non lascia nessun trigger applicativo spento, e ne conta esattamente diciassette', async () => {
    const esaminati = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>(`
        select count(*) as n from pg_trigger g
        join pg_class c on c.oid = g.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and not g.tgisinternal
      `)
      return Number(r.rows[0].n)
    })
    expect(esaminati).toBe(TRIGGER_ATTESI)
    const spenti = await asOwner(async (c) => {
      const r = await c.query<{ t: string; g: string }>(`
        select c.relname as t, g.tgname as g
        from pg_trigger g join pg_class c on c.oid = g.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and not g.tgisinternal and g.tgenabled <> 'O'
        order by 1, 2
      `)
      return r.rows
    })
    expect(spenti).toEqual([])
  })

  // Vedi VISTE_DICHIARATE: una vista in `public` scavalca la sicurezza per riga
  // e nessun altro audit la guarda.
  it('non lascia in public nessuna vista, che sfuggirebbe a ogni audit di tabella', async () => {
    const viste = await asOwner(async (c) => {
      const r = await c.query<{ v: string; genere: string }>(`
        select c.relname as v, c.relkind as genere
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('v', 'm')
        order by 1
      `)
      return r.rows.map((x) => x.v)
    })
    expect(viste).toEqual(VISTE_DICHIARATE)
  })

  // La chiusura immediata poggia su una tabella interna di Supabase: se una
  // versione futura togliesse al proprietario il diritto di leggerla, ogni
  // richiesta fallirebbe. Il guasto sarebbe rumoroso, ma questa prova lo trova
  // prima, in CI.
  // ⚠︎ QUESTA PROVA NON È VERIFICABILE PER MUTAZIONE, e chi la legge non la
  // creda presidiata come le altre. Misurato il 30/09/2026, tre ragioni
  // indipendenti, ciascuna sufficiente:
  //   1. `revoke select on table auth.sessions from postgres` emesso da
  //      `postgres` è un NO-OP SILENZIOSO: la tabella è di
  //      `supabase_auth_admin`, e un revoke di chi non è il concedente non
  //      tocca l'ACL (riletta dopo: invariata, `postgres=ar*wdDxtm/…`);
  //   2. anche riuscendo, `postgres` è membro di `pg_read_all_data`, che gli
  //      ridarebbe il SELECT per appartenenza;
  //   3. diventare il concedente è rifiutato — `grant supabase_auth_admin to
  //      postgres` → «role memberships are reserved, only superusers can grant
  //      them»; qui `postgres` NON è superuser (rolsuper = false, il superuser
  //      è `supabase_admin`). E `alter role postgres nobypassrls`, l'unico
  //      altro appiglio, è rifiutato con «permission denied to alter role».
  //
  // (Una quarta via è stata tentata e bloccata: `alter table auth.sessions
  // rename column user_id to …` → «must be owner of table sessions».)
  //
  // Conseguenza onesta: è un CANARINO su Supabase, non un presidio sul codice
  // di questo repo. Può arrossire solo se un'immagine futura cambia la fixture
  // — che è esattamente il guasto per cui esiste.
  //
  // ⚠︎ E UN TERMINE DEL CRITERIO ERA VACUO, ora tolto. La prima stesura
  // asseriva `has_table_privilege('postgres','auth.sessions','SELECT')`: ma
  // `pg_has_role('postgres','pg_read_all_data','MEMBER')` è **true**, quindi
  // quel SELECT sarebbe vero anche con l'ACL della tabella SVUOTATO. Il criterio
  // conteneva ciò che doveva dimostrare. Si legge invece l'ACL: `postgres` ha
  // SELECT e DELETE **esplicitamente** concessi da `supabase_auth_admin`
  // (`postgres=ar*wdDxtm/supabase_auth_admin`, misurato), ed è proprio quello
  // che una versione futura può togliere.
  //
  // ⚠︎ Gli altri due termini invece NON sono vacui, e la misura lo ha
  // dimostrato contro l'ipotesi opposta:
  //   • `pg_write_all_data` → **false**: il DELETE viene dal grant esplicito e
  //     non dall'appartenenza a un ruolo, quindi è un'asserzione vera;
  //   • `auth.sessions` ha `relrowsecurity` = **true**, quindi `rolbypassrls`
  //     su `postgres` serve davvero al percorso della chiusura immediata, e
  //     non è un termine decorativo.
  it('lascia al proprietario i diritti su auth.sessions da cui dipende la chiusura immediata', async () => {
    const stato = await asOwner(async (c) => {
      const r = await c.query<{ espliciti: number; bypass: boolean; colonne: number }>(`
        select
          (select count(distinct a.privilege_type)::int
             from pg_class c
             cross join lateral aclexplode(c.relacl) a
            where c.oid = 'auth.sessions'::regclass
              and a.grantee = 'postgres'::regrole
              and a.privilege_type in ('SELECT', 'DELETE')) as espliciti,
          (select rolbypassrls from pg_roles where rolname = 'postgres') as bypass,
          (select count(*)::int from information_schema.columns
            where table_schema = 'auth' and table_name = 'sessions'
              and column_name in ('id', 'user_id')) as colonne
      `)
      return r.rows[0]
    })
    expect(stato).toEqual({ espliciti: 2, bypass: true, colonne: 2 })
  })

  // MIGRAZIONE-SALTATA: un file che il CLI salta in silenzio non lo vede
  // nessuno — il reset esce 0 e lo schema è semplicemente monco.
  //
  // ⚠︎ È la PRIMA prova di questo repo che guarda quell'ordine, ed è per questo
  // che 00051_privilege_baseline.sql — cinque cifre dove tutte le altre ne
  // hanno quattro — non va «corretto»: se un giorno questa prova arrossisse su
  // quel file, avrebbe trovato qualcosa di vero. L'ordinamento per stringa dei
  // due lati coincide (misurato: '0005' < '00051' < '0006').
  it('applica ogni file di supabase/migrations, senza saltarne nessuno', async () => {
    const { readdirSync } = await import('node:fs')
    const suDisco = readdirSync('supabase/migrations')
      .filter((f) => f.endsWith('.sql'))
      .map((f) => f.replace(/_.*$/, ''))
      .sort()
    const applicate = await asOwner(async (c) => {
      const r = await c.query<{ v: string }>('select version as v from supabase_migrations.schema_migrations order by 1')
      return r.rows.map((x) => x.v)
    })
    expect(applicate).toEqual(suDisco)
  })

  // ─── Task 9, Passo 1-bis: i due presidi rimandati qui per nome ───────────

  // Uguaglianza ESATTA, non `like`: vedi FORMA_DELLE_POLITICHE per il reperto
  // S4-6 e per il perché i tre numeri si asseriscono tutti e tre.
  it('dà a ogni politica di public esattamente la forma dichiarata, e sono sedici', async () => {
    const { espressioni, politiche } = await asOwner(async (c) => {
      const e = await c.query<{ t: string; p: string; lato: string; e: string }>(`
        select c.relname as t, p.polname as p, v.lato, v.e
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral (values
          ('using', pg_get_expr(p.polqual, p.polrelid)),
          ('with check', pg_get_expr(p.polwithcheck, p.polrelid))
        ) as v(lato, e)
        where n.nspname = 'public' and v.e is not null
        order by 1, 2, 3
      `)
      const n = await c.query<{ n: string }>(`
        select count(*) as n from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
      `)
      return { espressioni: e.rows, politiche: Number(n.rows[0].n) }
    })
    const difformi = espressioni
      .filter((x) => x.e !== FORMA_DELLE_POLITICHE)
      .map((x) => `${x.t}.${x.p} (${x.lato}): ${x.e}`)
    expect(difformi).toEqual([])
    expect(politiche).toBe(POLITICHE_ATTESE)
    expect(espressioni.length).toBe(ESPRESSIONI_ATTESE)
  })

  // Il percorso è relativo alla radice del repo, come già fa
  // access-control.test.ts:24: vitest.config.ts non fissa `root`, quindi il
  // cwd della passata è la radice.
  //
  // ⚠︎ `schemas` compare tre volte in config.toml — la riga vera, un commento
  // due righe sopra e `declarative_schema_path` in fondo — quindi la sezione
  // [api] si isola prima, dalla sua intestazione alla successiva di primo
  // livello, e il confronto è ancorato a inizio riga. Un audit non ancorato
  // sull'intero file passerebbe pescando il commento.
  it('espone a PostgREST esattamente public e graphql_public', async () => {
    const { readFileSync } = await import('node:fs')
    const config = readFileSync('supabase/config.toml', 'utf8')
    const sezione = config.match(/^\[api\]\n([\s\S]*?)(?=^\[)/m)
    expect(sezione).not.toBeNull()
    const [, blocco] = sezione!
    const riga = blocco.match(/^schemas\s*=\s*(.+)$/m)
    expect(riga).not.toBeNull()
    expect(riga![1].trim()).toBe(SCHEMI_ESPOSTI)
  })
})
