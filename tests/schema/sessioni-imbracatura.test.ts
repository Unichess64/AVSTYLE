// tests/schema/sessioni-imbracatura.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { VERA_AUTH, asOperator, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { accedi, sessioneDi } from '../helpers/sessioni'

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
      const r = await c.query<{ n: string }>('select count(*) as n from auth.sessions where id = $1', [
        sessione.sessionId,
      ])
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
})
