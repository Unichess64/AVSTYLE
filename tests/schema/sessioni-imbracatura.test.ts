// tests/schema/sessioni-imbracatura.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  VERA_AUTH,
  asOperator,
  asOperatorCommit,
  asOperatorConSessione,
  asOperatorSenzaSessione,
  asOwner,
  esigiDatabaseLocale,
  resetData,
} from '../helpers/db'
import { accedi, preparaAccountLocali, sessioneDi } from '../helpers/sessioni'

beforeEach(async () => {
  await resetData()
})

describe('imbracatura con sessioni vere', () => {
  it('accede davvero e riceve un token con un session_id', async () => {
    const sessione = await accedi('vera@example.test')
    expect(sessione.sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(sessione.userId).toBe(VERA_AUTH)
  })

  it('riusa la stessa sessione invece di accedere a ogni chiamata', async () => {
    const a = await sessioneDi(VERA_AUTH)
    const b = await sessioneDi(VERA_AUTH)
    expect(b.sessionId).toBe(a.sessionId)
  })

  it('porta il session_id dentro i claim della connessione di prova', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    const dal_db = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ s: string }>(
        "select current_setting('request.jwt.claims', true)::jsonb->>'session_id' as s",
      )
      return r.rows[0].s
    })
    expect(dal_db).toBe(sessione.sessionId)
  })

  it('la sessione che l imbracatura usa esiste davvero in auth.sessions', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    const quante = await asOwner(async (c) => {
      // `and user_id`: contare il solo id non distingue «la sessione di Vera»
      // da «una sessione qualsiasi», e una voce sbagliata in EMAIL_DI
      // resterebbe muta (dalla revisione del Task 2).
      const r = await c.query<{ n: string }>(
        'select count(*) as n from auth.sessions where id = $1 and user_id = $2',
        [sessione.sessionId, VERA_AUTH],
      )
      return Number(r.rows[0].n)
    })
    expect(quante).toBe(1)
  })

  // Su `client`, che un'operatrice PUÒ scrivere: su `invio` la scrittura
  // diretta è vietata (Task 1) e le due prove misurerebbero quel divieto.
  const CLIENTE = '40000000-0000-4000-8000-0000000000c1'

  it('con asOperatorCommit la scrittura resta, e si rilegge da un altra connessione', async () => {
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('insert into client (id, full_name, phone) values ($1, $2, $3)', [CLIENTE, 'Prova Commit', null]),
    )
    const quanti = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from client where id = $1', [CLIENTE])
      return Number(r.rows[0].n)
    })
    expect(quanti).toBe(1)
  })

  it('con asOperator invece la scrittura sparisce: è la differenza che conta', async () => {
    await asOperator(VERA_AUTH, (c) =>
      c.query('insert into client (id, full_name, phone) values ($1, $2, $3)', [CLIENTE, 'Prova Rollback', null]),
    )
    const quanti = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from client where id = $1', [CLIENTE])
      return Number(r.rows[0].n)
    })
    expect(quanti).toBe(0)
  })

  it('resetData non chiude le sessioni delle prove', async () => {
    const prima = await sessioneDi(VERA_AUTH)
    await resetData()
    const dopo = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from auth.sessions where id = $1', [prima.sessionId])
      return Number(r.rows[0].n)
    })
    expect(dopo).toBe(1)
  })
  // I due aiuti negativi non erano esercitati da nessuna prova, e la revisione
  // del Task 2 ha misurato il danno: facendo cadere il claim `sub` da entrambi
  // — cioè scrivendo `inRole('authenticated', null, …)`, la forma di asAnon —
  // oggi nessuna prova arrossisce, e al Task 3 tutte e quattro le prove della
  // chiusura immediata restano VERDI con D3-17 assente dal database.

  const CLAIM = `select current_setting('request.jwt.claims', true)::jsonb->>'sub' as sub,
                        current_setting('request.jwt.claims', true)::jsonb->>'session_id' as sessione`
  type Claim = { sub: string | null; sessione: string | null }

  it('asOperatorSenzaSessione porta il sub vero e una sessione che non esiste', async () => {
    const claim = await asOperatorSenzaSessione(VERA_AUTH, async (c) => (await c.query<Claim>(CLAIM)).rows[0])
    expect(claim.sub).toBe(VERA_AUTH)
    expect(claim.sessione).toMatch(/^[0-9a-f-]{36}$/)
    const quante = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from auth.sessions where id = $1', [
        claim.sessione,
      ])
      return Number(r.rows[0].n)
    })
    expect(quante).toBe(0)
  })

  it('asOperatorConSessione porta il sub vero e la sessione che riceve', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    const claim = await asOperatorConSessione(VERA_AUTH, sessione.sessionId, async (c) =>
      (await c.query<Claim>(CLAIM)).rows[0],
    )
    expect(claim.sub).toBe(VERA_AUTH)
    expect(claim.sessione).toBe(sessione.sessionId)
  })

  it('le prove rifiutano un database che non sia quello locale', () => {
    expect(() => esigiDatabaseLocale('postgresql://postgres:segreta@db.abcdefghijkl.supabase.co:5432/postgres')).toThrow(
      /solo sul database locale/,
    )
  })

  it('e accettano quello locale: la gemella che rende capace di fallire la precedente', () => {
    expect(() => esigiDatabaseLocale('postgresql://postgres:postgres@127.0.0.1:54322/postgres')).not.toThrow()
  })

  // Le due qui sotto presidiano il COLLEGAMENTO, non la logica: togliendo la
  // chiamata alla guardia da resetData o da preparaAccountLocali, le due prove
  // sopra restavano verdi (misurato: zero rosse) e il buco si riapriva intero.
  async function conDatabaseFinto(fn: () => Promise<unknown>): Promise<unknown> {
    const prima = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://postgres:segreta@db.abcdefghijkl.supabase.co:5432/postgres'
    try {
      return await fn()
    } finally {
      if (prima === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = prima
    }
  }

  it('resetData si rifiuta di girare su un database non locale', async () => {
    await conDatabaseFinto(async () => {
      await expect(resetData()).rejects.toThrow(/solo sul database locale/)
    })
  })

  it('preparaAccountLocali si rifiuta di scrivere su un database non locale', async () => {
    await conDatabaseFinto(async () => {
      await expect(preparaAccountLocali()).rejects.toThrow(/solo sul database locale/)
    })
  })
})
