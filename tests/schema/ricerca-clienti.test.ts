import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, ANNALISA, ANNALISA_AUTH, VERA, VERA_AUTH, asOperator, asOwner, resetData } from '../helpers/db'
import { CLIENT_MARIA, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni } from '../helpers/sessioni'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const cerca = (testo: string) =>
  asOperator(VERA_AUTH, async (c) => {
    const r = await c.query<{ full_name: string }>('select full_name from cerca_clienti($1)', [testo])
    return r.rows.map((x) => x.full_name)
  })

describe('cerca_clienti', () => {
  it('trova una cliente scritta con un refuso, come chiede la spec §8.2', async () => {
    expect(await cerca('maria rosi')).toContain('Maria Rossi')
  })

  it('trova una cliente ignorando accenti e maiuscole', async () => {
    expect(await cerca('LUCIA CICCARE')).toContain('Lucia Ciccarè')
  })

  it('trova per numero di telefono', async () => {
    expect(await cerca('3331234567')).toContain('Maria Rossi')
  })

  it('non restituisce chi non c entra', async () => {
    expect(await cerca('Giuseppe Verdi')).toEqual([])
  })

  it('non restituisce niente per una ricerca vuota', async () => {
    expect(await cerca('')).toEqual([])
    expect(await cerca('   ')).toEqual([])
  })

  it('non risponde a un account che non è operatrice attiva', async () => {
    // Su ANNALISA e non su Vera: disattivare l'operatrice dell'imbracatura ne
    // chiuderebbe la sessione (Task 4) e avvelenerebbe le prove che seguono in
    // questo stesso file.
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const righe = await asOperator(ANNALISA_AUTH, async (c) =>
      (await c.query("select * from cerca_clienti('maria')")).rows,
    )
    expect(righe).toEqual([])
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    dimenticaSessioni()
  })
})

describe('doppioni_cliente', () => {
  it('riconosce lo stesso telefono in formato diverso', async () => {
    const motivi = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ motivo: string }>("select motivo from doppioni_cliente('Maria R.', '+393331234567')")
      return r.rows.map((x) => x.motivo)
    })
    expect(motivi).toContain('telefono')
  })

  it('riconosce un nome simile', async () => {
    const motivi = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ motivo: string }>("select motivo from doppioni_cliente('maria rosi', null)")
      return r.rows.map((x) => x.motivo)
    })
    expect(motivi).toContain('nome')
  })

  it('non segnala un nome che non somiglia', async () => {
    const righe = await asOperator(VERA_AUTH, async (c) => (await c.query("select * from doppioni_cliente('Anna Neri', null)")).rows)
    expect(righe).toEqual([])
  })
})

describe('il guardiano ridefinito', () => {
  it('rifiuta la cancellazione dell ultima operatrice collegata', async () => {
    // Presidia `operator_lockout_guard_del`: senza questa prova, togliere quel
    // trigger non fa arrossire niente (misurato).
    const codice = await asOwner(async (c) => {
      try {
        await c.query('begin')
        await c.query('update operator set is_active = false where id in ($1, $2)', [ANNALISA, ALESSANDRA])
        await c.query('delete from operator where id = $1', [VERA])
        await c.query('commit')
        return 'nessun errore'
      } catch (e) {
        await c.query('rollback')
        return (e as { code?: string }).code
      }
    })
    expect(codice).toBe('23514')
  })

  it('lascia cancellare un operatrice quando ne resta un altra collegata', async () => {
    const TEMP = '10000000-0000-4000-8000-0000000000e3'
    const codice = await asOwner(async (c) => {
      try {
        await c.query(
          `insert into operator (id, auth_user_id, name, color, sort_order)
           values ($1, null, 'Temp2', '#000000', 7)`,
          [TEMP],
        )
        await c.query('delete from operator where id = $1', [TEMP])
        return 'nessun errore'
      } catch (e) {
        return (e as { code?: string }).code
      }
    })
    expect(codice).toBe('nessun errore')
  })
})

describe('colori delle operatrici', () => {
  // Nota: `#C2185B` è già il valore seminato da 0001 per Vera, quindi solo
  // Annalisa e Alessandra provano qualcosa. È dichiarato per non far sembrare
  // un presidio quello che per Vera non lo è.
  it('ha i colori scelti dall utente, non quelli del primo piano', async () => {
    const colori = await asOwner(async (c) => {
      const r = await c.query<{ id: string; color: string }>('select id, color from operator order by sort_order')
      return Object.fromEntries(r.rows.map((x) => [x.id, x.color]))
    })
    expect(colori[VERA]).toBe('#C2185B')
    expect(colori[ANNALISA]).toBe('#FFFFFF')
    expect(colori[ALESSANDRA]).toBe('#9B1B1B')
  })
})
