import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ALESSANDRA, ANNALISA, VERA,
  ALESSANDRA_AUTH, ANNALISA_AUTH, OUTSIDER_AUTH, VERA_AUTH,
  asAnon, asOperator, asOwner, resetData,
} from '../helpers/db'

beforeEach(async () => {
  await resetData()
})

describe('auth configuration', () => {
  // The README asserts this. Without the assertion, the README is a false claim.
  //
  // config.toml has THREE `enable_signup` keys — under [auth], [auth.email]
  // and [auth.sms] — so an unanchored regex over the whole file can match
  // any of the three and never actually pin down the [auth] one this task
  // set to false. [auth.email]'s enable_signup must stay true: it is the
  // email/password provider toggle, and the three operators sign in with
  // email/password. So this isolates the [auth] section (from its header
  // to the next top-level `[` line) and asserts against that block alone.
  it('disables self-service signup and anonymous sign-in locally', () => {
    const config = readFileSync('supabase/config.toml', 'utf8')
    const authSection = config.match(/^\[auth\]\n([\s\S]*?)(?=^\[)/m)
    expect(authSection).not.toBeNull()
    const [, block] = authSection!
    expect(block).toMatch(/^\s*enable_signup\s*=\s*false/m)
    expect(block).toMatch(/^\s*enable_anonymous_sign_ins\s*=\s*false/m)
  })
})

describe('access control', () => {
  it('lets an active, linked operator read the operators', async () => {
    const names = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ name: string }>('select name from operator order by sort_order')
      return r.rows.map((x) => x.name)
    })
    expect(names).toEqual(['Vera', 'Annalisa', 'Alessandra'])
  })

  it('shows nothing to an unauthenticated visitor', async () => {
    const n = await asAnon(async (c) => (await c.query('select id from operator')).rowCount)
    expect(n).toBe(0)
  })

  // La gemella positiva di questa è `lets an active, linked operator read the
  // operators`, due prove sopra: stessa imbracatura, stessa query, un account
  // che invece È operatrice. Senza di lei questo `toBe(0)` resterebbe verde
  // anche con l'imbracatura rotta — misurato col Task 3 portando in
  // `asOperator` una sessione morta.
  it('shows nothing to an authenticated account that is not an operator', async () => {
    const n = await asOperator(OUTSIDER_AUTH, async (c) => (await c.query('select id from operator')).rowCount)
    expect(n).toBe(0)
  })

  it('shows nothing to a deactivated operator', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ALESSANDRA]))
    const n = await asOperator(ALESSANDRA_AUTH, async (c) => (await c.query('select id from operator')).rowCount)
    expect(n).toBe(0)
  })

  // La gemella positiva di quella sopra, e l'unica prova che esercita la
  // sessione di ALESSANDRA: stessa imbracatura, stesso account, stessa query,
  // con la riga ATTIVA. Il `toBe(0)` di sopra è soddisfatto anche da una
  // sessione morta o trasposta, e allora misurerebbe l'imbracatura rotta
  // invece di `is_active`.
  it('lets that same operator read once she is active again, with the same harness', async () => {
    const n = await asOperator(ALESSANDRA_AUTH, async (c) => (await c.query('select id from operator')).rowCount)
    expect(n).toBe(3)
  })

  it('does not recurse on the operator policy itself', async () => {
    const n = await asOperator(ANNALISA_AUTH, async (c) =>
      (await c.query('select id from operator where id = $1', [ANNALISA])).rowCount,
    )
    expect(n).toBe(1)
  })

  it('seeds exactly three operators with the expected ids', async () => {
    const ids = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ id: string }>('select id from operator order by sort_order')
      return r.rows.map((x) => x.id)
    })
    expect(ids).toEqual([VERA, ANNALISA, ALESSANDRA])
  })
})
