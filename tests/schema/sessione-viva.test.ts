// tests/schema/sessione-viva.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANNALISA_AUTH,
  VERA_AUTH,
  asOperator,
  asOperatorConSessione,
  asOperatorSenzaSessione,
  asOwner,
  resetData,
} from '../helpers/db'
import { CLIENT_MARIA, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni, sessioneDi } from '../helpers/sessioni'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('chiusura immediata', () => {
  it('lascia leggere chi ha una sessione viva', async () => {
    const nomi = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string }>('select full_name as n from client where id = $1', [CLIENT_MARIA])
      return r.rows.map((x) => x.n)
    })
    expect(nomi).toEqual(['Maria Rossi'])
  })

  it('non lascia leggere un token la cui sessione non esiste', async () => {
    const righe = await asOperatorSenzaSessione(VERA_AUTH, async (c) => {
      const r = await c.query('select id from client')
      return r.rows
    })
    expect(righe).toEqual([])
  })

  it('non lascia scrivere un token la cui sessione non esiste', async () => {
    const quante = await asOperatorSenzaSessione(VERA_AUTH, async (c) => {
      const r = await c.query('update client set no_messages = true where id = $1', [CLIENT_MARIA])
      return r.rowCount
    })
    expect(quante).toBe(0)
  })

  it('smette di far leggere appena la sessione sparisce, senza aspettare la scadenza del token', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner((c) => c.query('delete from auth.sessions where id = $1', [sessione.sessionId]))
    // Con lo STESSO token di prima: asOperator riaccederebbe e la prova
    // diventerebbe verde per il motivo sbagliato.
    const righe = await asOperatorConSessione(VERA_AUTH, sessione.sessionId, async (c) => {
      const r = await c.query('select id from client')
      return r.rows
    })
    expect(righe).toEqual([])
    dimenticaSessioni()
  })

  // Prescritta dalla sonda 2 del Passo 7: senza `and s.user_id = auth.uid()`
  // basterebbe UNA sessione viva qualsiasi, di chiunque, perché il token di
  // Vera passasse. La sessione di Annalisa esiste davvero — è il punto: il
  // secondo `exists` la trova, e solo il confronto con auth.uid() la rifiuta.
  it('non lascia passare un token di Vera con il session_id di un altra', async () => {
    const annalisa = await sessioneDi(ANNALISA_AUTH)
    const righe = await asOperatorConSessione(VERA_AUTH, annalisa.sessionId, async (c) => {
      const r = await c.query('select id from client')
      return r.rows
    })
    expect(righe).toEqual([])
  })

  // La gemella positiva di quella sopra: stesso aiuto, stessa query, ma il
  // session_id GIUSTO. Senza di lei il `toEqual([])` resterebbe verde anche se
  // `asOperatorConSessione` smettesse di portare i claim.
  it('e lascia passare lo stesso token con il session_id che è davvero suo', async () => {
    const vera = await sessioneDi(VERA_AUTH)
    const righe = await asOperatorConSessione(VERA_AUTH, vera.sessionId, async (c) => {
      const r = await c.query('select id from client')
      return r.rows
    })
    expect(righe.length).toBeGreaterThan(0)
  })

  it('tiene fuori anon, che un session_id non ce l ha proprio', async () => {
    // La transazione esplicita serve: asOwner non ne apre una, e un
    // set_config(..., true) fuori da un blocco vale solo per la propria
    // istruzione. Senza, la prova misurerebbe «nessun claim», non «anon».
    const attiva = await asOwner(async (c) => {
      await c.query('begin')
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: 'anon' })])
      const r = await c.query<{ a: boolean }>('select app.is_active_operator() as a')
      await c.query('rollback')
      return r.rows[0].a
    })
    expect(attiva).toBe(false)
  })

  it('non va in errore quando il claim è la stringa vuota', async () => {
    // La GUC resta a '' dopo un set_config locale: è il caso del pool di
    // PostgREST che riusa una connessione. Senza il nullif giusto qui esce
    // 22P02 da dentro ogni politica.
    const attiva = await asOwner(async (c) => {
      await c.query('begin')
      await c.query("select set_config('request.jwt.claims', '', true)")
      const r = await c.query<{ a: boolean }>('select app.is_active_operator() as a')
      await c.query('rollback')
      return r.rows[0].a
    })
    expect(attiva).toBe(false)
  })

  // Il gemello speculare della prova qui sopra, e la sola vittima del nullif
  // ESTERNO: là il claim MANCA (`->>` dà NULL), qui c'è e vale la stringa
  // vuota, e senza `nullif(..., '')` prima del cast a uuid esce 22P02 da
  // dentro OGNI politica. Nessuna fonte di oggi produce questa forma — né
  // GoTrue né l'imbracatura — quindi senza questa prova la protezione è muta:
  // misurato col Task 3, togliere quel nullif dava ZERO rosse.
  it('non va in errore nemmeno quando il session_id è la stringa vuota', async () => {
    const attiva = await asOwner(async (c) => {
      await c.query('begin')
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: '' }),
      ])
      const r = await c.query<{ a: boolean }>('select app.is_active_operator() as a')
      await c.query('rollback')
      return r.rows[0].a
    })
    expect(attiva).toBe(false)
  })
})

describe('forma delle politiche', () => {
  it('avvolge il predicato in un select su ognuna delle politiche di public', async () => {
    const fuori = await asOwner(async (c) => {
      // `or`, non `and`: con l'and una politica che ha lo USING giusto e il
      // WITH CHECK nudo non compare mai, e la sonda che toglie il select da un
      // lato solo resta verde (misurato).
      const r = await c.query<{ t: string; p: string }>(`
        select c.relname as t, p.polname as p
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'realtime')
          and (
            (p.polqual is not null
             and pg_get_expr(p.polqual, p.polrelid)
                 not like '%( SELECT app.is_active_operator() AS is_active_operator)%')
            or
            (p.polwithcheck is not null
             and pg_get_expr(p.polwithcheck, p.polrelid)
                 not like '%( SELECT app.is_active_operator() AS is_active_operator)%')
          )
        order by 1, 2
      `)
      return r.rows
    })
    expect(fuori).toEqual([])
  })

  it('conta quante politiche ha esaminato, perché un elenco vuoto non è una prova', async () => {
    const quante = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>(`
        select count(*) as n from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
      `)
      return Number(r.rows[0].n)
    })
    expect(quante).toBe(15)
  })
})
