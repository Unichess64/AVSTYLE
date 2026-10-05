// tests/schema/presidi-mancanti.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, VERA, VERA_AUTH, asOperatorCommit, asOwner, connect, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const V1 = '50000000-0000-4000-8000-0000000000aa'
const A1 = '60000000-0000-4000-8000-0000000000aa'
const A2 = '60000000-0000-4000-8000-0000000000ab'
let seq = 0
const cod = () => `70000000-0000-4000-8000-5${String(++seq).padStart(11, '0')}`
const app1 = (id: string, inizio: number, operatrice = VERA, servizio = SERVICE_REFILL, durata = 12) => ({
  id, operatrice, servizio, inizio, durata,
})

const crea = (appuntamenti: unknown[] = [app1(A1, 120)]) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: { esito: string; visita: string; appuntamenti: { id: string; versione: string }[] } }>(
      'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
      [cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify(appuntamenti)],
    )
    return r.rows[0].r
  })

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('presidi che il design chiede e che i task precedenti non coprono', () => {
  it('23503: la cliente cancellata fra due invii dà un errore proprio, e non ricompare', async () => {
    await crea()
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    const esito = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
          cod(),
          '50000000-0000-4000-8000-0000000000ac',
          CLIENT_MARIA,
          DAY_ONE,
          JSON.stringify([app1('60000000-0000-4000-8000-0000000000ac', 200)]),
        ])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(esito).toBe('23503')
    const clienti = await asOwner(async (c) =>
      Number((await c.query('select count(*) as n from client where id = $1', [CLIENT_MARIA])).rows[0].n),
    )
    expect(clienti).toBe(0)
  })

  it('aggiunta arrivata e poi tolta da una collega: la versione della visita basta a distinguerla da «mai arrivata»', async () => {
    const creata = await crea()
    // Una collega aggiunge e poi toglie: lo stato torna identico.
    const conPedicure = await asOperatorCommit(VERA_AUTH, async (c) => {
      const r = await c.query<{ r: { visita: string; appuntamenti: { id: string; versione: string }[] } }>(
        'select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r',
        [
          cod(), V1, CLIENT_MARIA, DAY_ONE,
          JSON.stringify([app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)]),
          creata.visita, JSON.stringify(creata.appuntamenti),
        ],
      )
      return r.rows[0].r
    })
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7)', [
        cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([app1(A1, 120)]),
        conPedicure.visita, JSON.stringify(conPedicure.appuntamenti),
      ]),
    )
    const versioneOra = await asOwner(async (c) => {
      const r = await c.query<{ v: string }>('select app.versione(updated_at) as v from visit where id = $1', [V1])
      return r.rows[0].v
    })
    // Se la versione della visita non cambiasse quando cambia l'insieme, questa
    // sarebbe uguale a quella di partenza e «Controlla» direbbe «non risulta
    // salvata» di un salvataggio avvenuto.
    expect(versioneOra).not.toBe(creata.visita)
  })

  it('«Controlla» riga 5: salvata ma visita assente e non cancellata non deve accadere', async () => {
    const c1 = cod()
    await asOperatorCommit(VERA_AUTH, async (c) => {
      await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        c1, V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([app1(A1, 120)]),
      ])
    })
    // Si fabbrica lo stato impossibile: visita via, riga della tabella delle
    // cancellate via. Serve il proprietario, perché nessun percorso normale ci
    // arriva: è proprio il punto.
    await asOwner(async (c) => {
      await c.query('delete from visit where id = $1', [V1])
      await c.query('delete from visita_cancellata where id = $1', [V1])
    })
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: { riga: number } }>('select controlla_invio($1,$2) as r', [c1, V1])
      return x.rows[0].r
    })
    expect(r.riga).toBe(5)
  })

  it('la pulizia a 30 giorni toglie le righe vecchie e lascia le nuove', async () => {
    const vecchio = '70000000-0000-4000-8000-5ffffffffff1'
    const vecchiaVisita = '50000000-0000-4000-8000-0000000000ad'
    await asOwner(async (c) => {
      await c.query("insert into invio (codice, esito, aggiornato) values ($1, 'salvata', now() - interval '40 days')", [vecchio])
      await c.query("insert into visita_cancellata (id, cancellata_il) values ($1, now() - interval '40 days')", [vecchiaVisita])
    })
    await crea()
    const rimasti = await asOwner(async (c) => {
      const i = await c.query('select codice from invio where codice = $1', [vecchio])
      const v = await c.query('select id from visita_cancellata where id = $1', [vecchiaVisita])
      const nuovi = await c.query('select count(*) as n from invio')
      return { invioVecchio: i.rowCount, cancellataVecchia: v.rowCount, totale: Number((nuovi.rows[0] as { n: string }).n) }
    })
    expect(rimasti.invioVecchio).toBe(0)
    expect(rimasti.cancellataVecchia).toBe(0)
    expect(rimasti.totale).toBeGreaterThan(0)
  })

  it('il vincolo dell occupazione torna differito a ogni chiamata nella stessa transazione', async () => {
    // Due salvataggi nella stessa transazione, con uno SCAMBIO fra due
    // appuntamenti della STESSA operatrice: è l'unica forma che collide.
    // Misurato al terzo giro: con due operatrici diverse, come era scritto
    // prima, non c'è collisione possibile e la prova era verde con e senza la
    // mutazione. Vera: 120-131 e 132-143.
    const creata = await crea([app1(A1, 120), app1(A2, 132)])
    const sessione = await sessioneDi(VERA_AUTH)
    const c = await connect()
    let esito = 'nessun errore'
    try {
      await c.query('begin')
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await c.query('set local role authenticated')
      // primo scambio: A1 va dove sta A2 e viceversa
      const r1 = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
        'select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r',
        [cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([app1(A1, 132), app1(A2, 120)]),
         creata.visita, JSON.stringify(creata.appuntamenti)],
      )
      const dopo = r1.rows[0].r
      // secondo scambio, nella STESSA transazione: senza il `deferred` in testa
      // alla seconda chiamata, il `… immediate` della prima è ancora in vigore
      // e questo dà un falso 23505.
      await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7)', [
        cod(), V1, CLIENT_MARIA, DAY_ONE,
        JSON.stringify([app1(A1, 120), app1(A2, 132)]),
        dopo.visita, JSON.stringify(dopo.appuntamenti),
      ])
      await c.query('commit')
    } catch (e) {
      esito = pgCode(e) ?? 'ignoto'
      await c.query('rollback').catch(() => {})
    } finally {
      await c.end()
    }
    expect(esito).toBe('nessun errore')
  })
})
