// tests/schema/chiusura-sessioni.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANNALISA,
  ANNALISA_AUTH,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOperatorCommit,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'
import { accedi, dimenticaSessioni, rinnovoRiesce } from '../helpers/sessioni'

const vive = (authUid: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ n: string }>('select count(*) as n from auth.sessions where user_id = $1', [authUid])
    return Number(r.rows[0].n)
  })

/**
 * Azzera le sessioni degli account di prova PRIMA di ogni prova di questo file.
 *
 * Senza, una prova che lascia viva una sessione (per esempio «NON chiude niente
 * per un cambio di colore») fa contare 2 alla prova successiva, che si aspetta
 * 1: misurato.
 */
const pulisciSessioni = () =>
  asOwner((c) => c.query("delete from auth.sessions where user_id in (select id from auth.users where email like '%@example.test')"))

beforeEach(async () => {
  await resetData()
  await pulisciSessioni()
  dimenticaSessioni()
})

describe('il trigger chiude le sessioni', () => {
  it('quando l operatrice viene disattivata', async () => {
    const sessione = await accedi('annalisa@example.test')
    expect(await vive(ANNALISA_AUTH)).toBeGreaterThan(0)
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('quando l operatrice viene riattivata, per le sessioni nate mentre era fuori', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const sessione = await accedi('annalisa@example.test')
    expect(await vive(ANNALISA_AUTH)).toBe(1)
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('quando l account viene scollegato, e anche quando viene ricollegato', async () => {
    await accedi('annalisa@example.test')
    await asOwner((c) => c.query('update operator set auth_user_id = null where id = $1', [ANNALISA]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)

    const dopo = await accedi('annalisa@example.test')
    await asOwner((c) => c.query('update operator set auth_user_id = $2 where id = $1', [ANNALISA, ANNALISA_AUTH]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(dopo)).toBe(false)
  })

  it('quando la riga dell operatrice viene cancellata', async () => {
    // Su un'operatrice USA E GETTA: resetData() esclude `operator` dal truncate
    // e non ricrea le righe, quindi cancellare Annalisa la farebbe sparire per
    // tutta la suite, e ogni seedCatalogue() successivo prenderebbe 23503.
    const TEMP = '10000000-0000-4000-8000-0000000000e2'
    try {
      await asOwner((c) =>
        c.query(
          `insert into operator (id, auth_user_id, name, color, sort_order)
           values ($1, $2, 'Temp', '#C2185B', 8)`,
          [TEMP, OUTSIDER_AUTH],
        ),
      )
      const sessione = await accedi('outsider@example.test')
      await asOwner((c) => c.query('delete from operator where id = $1', [TEMP]))
      expect(await vive(OUTSIDER_AUTH)).toBe(0)
      expect(await rinnovoRiesce(sessione)).toBe(false)
    } finally {
      await asOwner((c) => c.query('delete from operator where id = $1', [TEMP]))
      dimenticaSessioni()
    }
  })

  it('quando un account che aveva già una sessione diventa operatrice', async () => {
    const PROVA = '10000000-0000-4000-8000-0000000000e1'
    try {
      const estraneo = await accedi('outsider@example.test')
      expect(await vive(OUTSIDER_AUTH)).toBe(1)
      await asOwner((c) =>
        c.query(
          `insert into operator (id, auth_user_id, name, color, sort_order)
           values ($1, $2, 'Prova', '#C2185B', 9)`,
          [PROVA, OUTSIDER_AUTH],
        ),
      )
      expect(await vive(OUTSIDER_AUTH)).toBe(0)
      expect(await rinnovoRiesce(estraneo)).toBe(false)
    } finally {
      // Senza questo resta una quarta operatrice committata per tutta la suite,
      // e access-control.test.ts si aspetta esattamente tre nomi.
      await asOwner((c) => c.query('delete from operator where id = $1', [PROVA]))
      dimenticaSessioni()
    }
  })

  it('NON chiude niente per un cambio di colore o di ordine', async () => {
    const prima = await asOwner(async (c) => {
      const r = await c.query<{ c: string; s: number }>(
        'select color as c, sort_order as s from operator where id = $1',
        [ANNALISA],
      )
      return r.rows[0]
    })
    try {
      const sessione = await accedi('annalisa@example.test')
      await asOwner((c) => c.query("update operator set color = '#123456', sort_order = 5 where id = $1", [ANNALISA]))
      expect(await vive(ANNALISA_AUTH)).toBe(1)
      expect(await rinnovoRiesce(sessione)).toBe(true)
    } finally {
      // resetData() non ripristina né color né sort_order: senza questo la
      // prova dei colori del Task 10 diventa rossa o verde a seconda
      // dell'ordine dei file, che Vitest decide per dimensione.
      await asOwner((c) =>
        c.query('update operator set color = $2, sort_order = $3 where id = $1', [ANNALISA, prima.c, prima.s]),
      )
    }
  })

  it('NON chiude niente per un aggiornamento che riscrive gli stessi valori', async () => {
    await accedi('annalisa@example.test')
    await asOwner((c) =>
      c.query('update operator set is_active = true, auth_user_id = $2 where id = $1', [ANNALISA, ANNALISA_AUTH]),
    )
    expect(await vive(ANNALISA_AUTH)).toBe(1)
  })
})

describe('public.chiudi_sessioni', () => {
  // ⚠︎ `asOperatorCommit`, non `asOperator`: il piano prescriveva `asOperator`,
  // che chiude SEMPRE con un rollback (`inRole`, tests/helpers/db.ts). Il
  // `delete from auth.sessions` di chiudi_sessioni veniva annullato, e `vive()`
  // — che legge da un'ALTRA connessione — trovava ancora 1: misurato, questa
  // prova era l'unica rossa dopo il Passo 4, con `quante` giusto a 1 e la
  // sessione ancora viva. Ogni prova che scrive e poi rilegge da fuori la
  // transazione ha bisogno che la scrittura resti; è esattamente il caso per
  // cui il Task 2 ha scritto `asOperatorCommit`.
  it('chiude le sessioni di un altra operatrice e dice quante ne ha chiuse', async () => {
    const sessione = await accedi('annalisa@example.test')
    const quante = await asOperatorCommit(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: number }>('select chiudi_sessioni($1) as n', [ANNALISA])
      return r.rows[0].n
    })
    expect(quante).toBe(1)
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('rifiuta l operatrice di chi la chiama: per le proprie sessioni c è l uscita globale', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('select chiudi_sessioni($1)', [VERA])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('P0004')
  })

  it('rifiuta un bersaglio che non è un operatrice', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('select chiudi_sessioni($1)', ['10000000-0000-4000-8000-0000000000ff'])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('P0004')
  })

  it('non fa niente se la chiama un account che non è operatrice attiva', async () => {
    const sessione = await accedi('annalisa@example.test')
    const codice = await asOperator(OUTSIDER_AUTH, async (c) => {
      try {
        await c.query('select chiudi_sessioni($1)', [ANNALISA])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('P0004')
    expect(await vive(ANNALISA_AUTH)).toBe(1)
    expect(await rinnovoRiesce(sessione)).toBe(true)
  })

  it('non è eseguibile da anon', async () => {
    const eseguibile = await asOwner(async (c) => {
      const r = await c.query<{ x: boolean }>(
        "select has_function_privilege('anon', 'public.chiudi_sessioni(uuid)', 'EXECUTE') as x",
      )
      return r.rows[0].x
    })
    expect(eseguibile).toBe(false)
  })

  it('non tocca MAI la password di nessuno', async () => {
    // L'accesso prima della lettura: `preparaAccountLocali()` riscrive la
    // password al primo `accedi` del file, e senza questa riga la prova
    // eseguita da sola confronterebbe due valori diversi.
    await accedi('annalisa@example.test')
    const prima = await asOwner(async (c) => {
      const r = await c.query<{ p: string }>('select encrypted_password as p from auth.users where id = $1', [
        ANNALISA_AUTH,
      ])
      return r.rows[0].p
    })
    await accedi('annalisa@example.test')
    // ⚠︎ Anche qui `asOperatorCommit`, e qui il piano faceva un danno PEGGIORE
    // che nella prova sopra: con il rollback di `asOperator` questa prova era
    // MUTA. Misurato — mettendo dentro `chiudi_sessioni` un
    // `update auth.users set encrypted_password = 'MUTAZIONE'` sul bersaglio,
    // la prova restava VERDE, perché la riscrittura veniva annullata insieme a
    // tutto il resto e la rilettura da un'altra connessione vedeva l'hash
    // vecchio. Con il commit la stessa mutazione la fa arrossire.
    await asOperatorCommit(VERA_AUTH, (c) => c.query('select chiudi_sessioni($1)', [ANNALISA]))
    const dopo = await asOwner(async (c) => {
      const r = await c.query<{ p: string }>('select encrypted_password as p from auth.users where id = $1', [
        ANNALISA_AUTH,
      ])
      return r.rows[0].p
    })
    expect(dopo).toBe(prima)
  })

  // ⚠︎ Aggiunta dalla revisione (reperto R2, trovato da tutte e due le
  // revisore indipendentemente). In ogni altra prova di questo file `quante`
  // vale 1, quindi l'intero contratto «dice quante ne ha chiuse» — il numero
  // che il pulsante del 3c mostra all'operatrice — non era misurato da
  // nessuno: misurato, un `perform …; return 1` costante dentro
  // `app.chiudi_sessioni_di` lasciava la suite intera verde, 0 rosse su 317.
  //
  // `accedi` due volte, non `sessioneDi`: la cache di `sessioneDi` ne
  // restituirebbe una sola. L'asserzione sui due `sessionId` diversi è la
  // precondizione, ASSERITA e non raccontata — se GoTrue riusasse la stessa
  // sessione, il `toBe(2)` qui sotto misurerebbe l'imbracatura invece della
  // funzione.
  it('dice quante sessioni ha chiuso davvero, anche quando sono più di una', async () => {
    const una = await accedi('annalisa@example.test')
    const due = await accedi('annalisa@example.test')
    expect(una.sessionId).not.toBe(due.sessionId)
    expect(await vive(ANNALISA_AUTH)).toBe(2)

    const quante = await asOperatorCommit(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: number }>('select chiudi_sessioni($1) as n', [ANNALISA])
      return r.rows[0].n
    })
    expect(quante).toBe(2)
    expect(await vive(ANNALISA_AUTH)).toBe(0)
  })

  // ⚠︎ Aggiunta dalla revisione (reperto R5). La prova qui sopra guarda solo
  // `anon` e solo la funzione di `public`: misurato, togliendo le due funzioni
  // di `app` dall'elenco del `revoke` di 0015 arrossiscono ZERO prove su 317.
  // In PostgreSQL l'EXECUTE va a PUBLIC per difetto, e `0001_access_control`
  // concede `usage on schema app` ad `anon` e ad `authenticated`: senza quella
  // riga chiunque potrebbe chiamare `app.chiudi_sessioni_di(<un auth uid
  // qualunque>)` scavalcando tutte e tre le guardie di `public.chiudi_sessioni`.
  //
  // Oggi il percorso NON è raggiungibile dall'app — `supabase/config.toml`
  // espone a PostgREST i soli schemi `public` e `graphql_public` — quindi è
  // difesa in profondità. Ma era difesa in profondità NON presidiata, e il
  // resto del repo presidia ogni EXECUTE per nome di ruolo.
  it('e nemmeno le due funzioni di app sono eseguibili, da nessuno dei due ruoli', async () => {
    const privilegi = await asOwner(async (c) => {
      const r = await c.query<{ f: string; ruolo: string; puo: boolean }>(
        `select f, ruolo, has_function_privilege(ruolo, f, 'EXECUTE') as puo
           from unnest(array['app.chiudi_sessioni_di(uuid)', 'app.chiudi_sessioni_operatrice()']) as f,
                unnest(array['anon', 'public', 'authenticated']) as ruolo
          order by f, ruolo`,
      )
      return r.rows
    })
    // Sei righe, non «nessuna riga»: un elenco vuoto passerebbe qualunque
    // asserzione sul contenuto. Un nome di ruolo inesistente solleva 42704,
    // quindi la riga non è inerte (misurato il 18/09/2026, availability-window).
    expect(privilegi).toHaveLength(6)
    expect(privilegi.filter((x) => x.puo)).toEqual([])
  })

  // La gemella POSITIVA delle due negative qui sopra, nella forma che il resto
  // del repo usa: senza di lei un `has_function_privilege` che tornasse falso
  // per una ragione qualunque — una firma sbagliata, un ruolo che non esiste —
  // renderebbe verdi tutte le negative senza misurare niente.
  //
  // ⚠︎ Il `toBe(true)` su `authenticated` NON presidia il `grant execute … to
  // authenticated` di 0015: quel grant è RIDONDANTE. Misurato il 24/09/2026:
  // commentandolo la suite resta verde, 320 su 320, perché in `public` esiste
  // un `alter default privileges` di Supabase — da DUE concedenti, `postgres` e
  // `supabase_admin` — che concede EXECUTE ad `anon`, `authenticated` e
  // `service_role` su OGNI funzione nuova. La mutazione è quindi EQUIVALENTE,
  // non muta, e vale per tutte le funzioni del repo, non solo per queste.
  // La riga che porta davvero è il `revoke … from public, anon`, che è ciò che
  // toglie ad `anon` quel grant per difetto: toltala, qui arrossiscono 3 prove.
  it('ma authenticated PUÒ eseguire public.chiudi_sessioni, e anon prende 42501, non zero righe', async () => {
    const codice = await asAnon(async (c) => {
      try {
        await c.query('select public.chiudi_sessioni($1)', [ANNALISA])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('42501')

    const privilegi = await asOwner(async (c) => {
      const r = await c.query<{ anon: boolean; pubblico: boolean; autenticato: boolean }>(
        `select has_function_privilege('anon', $1, 'EXECUTE') as anon,
                has_function_privilege('public', $1, 'EXECUTE') as pubblico,
                has_function_privilege('authenticated', $1, 'EXECUTE') as autenticato`,
        ['public.chiudi_sessioni(uuid)'],
      )
      return r.rows[0]
    })
    expect(privilegi.anon).toBe(false)
    expect(privilegi.pubblico).toBe(false)
    expect(privilegi.autenticato).toBe(true)
  })
})
