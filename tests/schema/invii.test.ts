// tests/schema/invii.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const V1 = '50000000-0000-4000-8000-0000000000a1'
const A1 = '60000000-0000-4000-8000-0000000000a1'
const A2 = '60000000-0000-4000-8000-0000000000a2'
const COD = '70000000-0000-4000-8000-0000000000a1'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('app.versione', () => {
  it('conserva i microsecondi e non dipende dal fuso della sessione', async () => {
    const [a, b] = await asOwner(async (c) => {
      // `set`, non `set local`: asOwner non apre una transazione, e un SET
      // LOCAL fuori da un blocco vale solo per la propria istruzione. Con
      // `set local` il fuso non cambierebbe mai e la sonda 1 sarebbe morta
      // (il server è in UTC).
      await c.query("set timezone = 'America/New_York'")
      const r1 = await c.query<{ v: string }>(
        "select app.versione(timestamptz '2026-03-12 09:00:00.123456+01') as v",
      )
      await c.query("set timezone = 'Europe/Rome'")
      const r2 = await c.query<{ v: string }>(
        "select app.versione(timestamptz '2026-03-12 09:00:00.123456+01') as v",
      )
      return [r1.rows[0].v, r2.rows[0].v]
    })
    expect(a).toBe('2026-03-12T08:00:00.123456Z')
    expect(b).toBe(a)
  })
})

describe('registro degli invii', () => {
  it('apre un codice nuovo restituendo null e lo ritrova alla seconda chiamata', async () => {
    const [primo, secondo] = await asOperator(VERA_AUTH, async (c) => {
      const r1 = await c.query<{ e: string | null }>('select app.apri_invio($1) as e', [COD])
      const r2 = await c.query<{ e: string | null }>('select app.apri_invio($1) as e', [COD])
      return [r1.rows[0].e, r2.rows[0].e]
    })
    expect(primo).toBeNull()
    expect(secondo).toBe('in_corso')
  })

  it('registra l esito e lo restituisce a chi riapre lo stesso codice', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      await c.query('select app.apri_invio($1)', [COD])
      await c.query('select app.chiudi_invio($1, $2)', [COD, 'salvata'])
      const r = await c.query<{ e: string }>('select app.apri_invio($1) as e', [COD])
      return r.rows[0].e
    })
    expect(esito).toBe('salvata')
  })

  it('rifiuta un esito che non esiste', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      await c.query('select app.apri_invio($1)', [COD])
      try {
        await c.query('select app.chiudi_invio($1, $2)', [COD, 'quasi_salvata'])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('23514')
  })

  it('non lascia scrivere il registro a un operatrice per via diretta', async () => {
    const esiti = await asOperator(VERA_AUTH, async (c) => {
      const out: (string | undefined)[] = []
      for (const sql of [
        `insert into invio (codice, esito) values ('${COD}', 'salvata')`,
        `update invio set esito = 'annullato'`,
        `delete from invio`,
      ]) {
        // Un savepoint per istruzione: dopo il primo 42501 la transazione è
        // abortita, e senza questo le altre due darebbero 25P02.
        await c.query('savepoint s')
        try {
          await c.query(sql)
          out.push('nessun errore')
          await c.query('release savepoint s')
        } catch (e) {
          out.push(pgCode(e))
          await c.query('rollback to savepoint s')
        }
      }
      return out
    })
    expect(esiti).toEqual(['42501', '42501', '42501'])
  })

  it('lascia leggere il registro a un operatrice attiva', async () => {
    await asOwner((c) => c.query("insert into invio (codice, esito) values ($1, 'salvata')", [COD]))
    const righe = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [COD])
      return r.rows.map((x) => x.e)
    })
    expect(righe).toEqual(['salvata'])
  })
})

describe('registro delle visite cancellate', () => {
  beforeEach(async () => {
    await asOwner(async (c) => {
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V1, CLIENT_MARIA, DAY_ONE])
      await c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $4, $5, $6, $7::date, 120, 12), ($2, $4, $3, $6, $7::date, 140, 10)`,
        [A1, A2, ALESSANDRA, V1, VERA, SERVICE_REFILL, DAY_ONE],
      )
    })
  })

  const cancellate = () =>
    asOwner(async (c) => {
      const r = await c.query<{ id: string }>('select id from visita_cancellata order by id')
      return r.rows.map((x) => x.id)
    })

  it('registra una visita cancellata direttamente', async () => {
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    expect(await cancellate()).toEqual([V1])
  })

  it('registra una visita rimasta orfana togliendo l ultimo appuntamento', async () => {
    await asOwner((c) => c.query('delete from appointment where id in ($1, $2)', [A1, A2]))
    expect(await cancellate()).toEqual([V1])
  })

  it('registra una visita che sparisce per cascata dalla cliente', async () => {
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    expect(await cancellate()).toEqual([V1])
  })

  it('non registra niente finché la visita conserva un appuntamento', async () => {
    await asOwner((c) => c.query('delete from appointment where id = $1', [A1]))
    expect(await cancellate()).toEqual([])
  })

  it('sopporta la stessa visita cancellata due volte', async () => {
    await asOwner(async (c) => {
      await c.query('delete from visit where id = $1', [V1])
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V1, CLIENT_MARIA, DAY_ONE])
      await c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5::date, 120, 12)`,
        [A1, V1, VERA, SERVICE_REFILL, DAY_ONE],
      )
      await c.query('delete from visit where id = $1', [V1])
    })
    expect(await cancellate()).toEqual([V1])
  })

  it('non lascia scrivere le cancellate a un operatrice per via diretta', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('delete from visita_cancellata')
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('42501')
  })
})
