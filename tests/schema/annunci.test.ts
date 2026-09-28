// tests/schema/annunci.test.ts
import { REALTIME_SUBSCRIBE_STATES, createClient } from '@supabase/supabase-js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { accedi, dimenticaSessioni } from '../helpers/sessioni'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const V1 = '50000000-0000-4000-8000-0000000000f1'
const A1 = '60000000-0000-4000-8000-0000000000f1'
let seq = 0
const cod = () => `70000000-0000-4000-8000-3${String(++seq).padStart(11, '0')}`

/** Ascolta gli inserimenti su `annuncio` con il token dato. */
async function ascolta(accessToken: string, ms = 4000) {
  const client = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  await client.realtime.setAuth(accessToken)
  const ricevuti: unknown[] = []
  let stato = 'in attesa'
  const canale = client.channel('annunci').on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'annuncio' },
    (m) => ricevuti.push(m.new),
  )
  await new Promise<void>((risolvi) => {
    canale.subscribe((s) => {
      if (s === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        stato = 'iscritto'
        risolvi()
      }
      if (s === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR || s === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        stato = String(s)
        risolvi()
      }
    })
    setTimeout(risolvi, ms)
  })
  return {
    stato: () => stato,
    async attendi(quanti = 1) {
      const fine = Date.now() + ms
      while (ricevuti.length < quanti && Date.now() < fine) await new Promise((r) => setTimeout(r, 50))
      await client.removeAllChannels()
      return ricevuti
    },
  }
}

const scrivi = () =>
  asOperatorCommit(VERA_AUTH, (c) =>
    c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
      cod(),
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
    ]),
  )

const annunci = () =>
  asOwner(async (c) => {
    const r = await c.query<{ g: string[] }>('select giorni as g from annuncio order by id')
    return r.rows.map((x) => x.g)
  })

/**
 * Il PRIMO canale aperto su `annuncio` dopo un `db reset` non consegna.
 *
 * Misurato il 28/09/2026, e non è un'attesa: con `SUBSCRIBED` già arrivato e
 * **30 secondi** di ritardo prima di aprirlo, il primo canale riceve comunque
 * ZERO; il secondo riceve. Sei tentativi di seguito: 0, 1, 1, 1, 1, 1. Quindi
 * `SUBSCRIBED` **non è la condizione vera** — è la stessa famiglia del criterio
 * di misura vacuo del Task 7, dove la prova si fidava di uno stato surrogato.
 *
 * Senza questa riga il gate del piano (`db reset && npm test`) è rosso a ogni
 * macchina pulita, sempre sulla prima prova del lato telefono.
 *
 * Il riscaldamento **non scrive niente**: aprire e chiudere un canale basta
 * (misurato nelle due forme, con e senza inserimento: il canale dopo riceve in
 * tutt'e due). Righe di riscaldamento sporcherebbero gli annunci che le prove
 * del lato database rileggono.
 *
 * E **non lancia**: se la tabella non fosse nella pubblicazione — cioè sotto la
 * sonda 1 — l'iscrizione riesce lo stesso e qui non succede nulla, quindi la
 * prova bersaglio resta ROSSA invece di diventare SALTATA (trappola 4).
 */
beforeAll(async () => {
  const sessione = await accedi('vera@example.test')
  const client = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${sessione.accessToken}` } },
  })
  await client.realtime.setAuth(sessione.accessToken)
  const canale = client
    .channel('riscaldamento')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annuncio' }, () => {})
  await new Promise<void>((risolvi) => {
    canale.subscribe((s) => {
      if (s === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED || s === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) risolvi()
    })
    setTimeout(risolvi, 4000)
  })
  await client.removeAllChannels()
}, 20000)

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('annunci, dal lato del database', () => {
  it('annuncia il giorno toccato', async () => {
    await scrivi()
    // Si asserisce il CONTENUTO, non il numero di righe: `salva_visita`
    // inserisce gli appuntamenti uno per istruzione, quindi un salvataggio
    // lascia 2 annunci con un appuntamento e 3 con due (misurato).
    const giorni = [...new Set((await annunci()).flat())]
    expect(giorni).toEqual([DAY_ONE])
  })

  it('una cancellazione a cascata lascia un annuncio per istruzione, non per riga', async () => {
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod(),
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([
          { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
          { id: '60000000-0000-4000-8000-0000000000f2', operatrice: ANNALISA, servizio: SERVICE_REFILL, inizio: 200, durata: 12 },
        ]),
      ]),
    )
    // La cancellazione della visita porta via DUE appuntamenti con UNA sola
    // istruzione (la cascata): è la forma in cui «per istruzione» e «per riga»
    // si distinguono davvero.
    await asOwner((c) => c.query('delete from annuncio'))
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    // Misurato: 2 annunci — uno dalla cascata sugli appuntamenti, uno dalla
    // delete sulla visita. Con `for each row` diventano 3. Il valore è esatto,
    // non un tetto: un tetto resterebbe verde anche a 1.
    const righe = await annunci()
    const daAppuntamenti = righe.filter((g) => g.includes(DAY_ONE))
    expect(daAppuntamenti.length).toBe(2)
  })

  it('annuncia il giorno VECCHIO e quello nuovo quando una visita cambia data', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const r = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
        'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
        [cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }])],
      )
      return r.rows[0].r
    })
    await asOwner((c) => c.query('delete from annuncio'))
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select sposta_visita_a($1,$2,$3::date,$4,$5,$6)', [
        cod(),
        V1,
        DAY_TWO,
        JSON.stringify([{ id: A1, inizio: 120 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ]),
    )
    const giorni = (await annunci()).flat()
    expect(giorni).toContain(DAY_ONE)
    expect(giorni).toContain(DAY_TWO)
  })

  it('non contiene nomi, telefoni né id di cliente', async () => {
    await scrivi()
    // Si legge la RIGA INTERA e si fissa l'elenco delle colonne. Leggendo la
    // sola colonna `giorni` questa prova resta VERDE anche dopo aver aggiunto
    // una colonna `client_id` con l'id di Maria: misurato al quinto giro, ed è
    // il modo esatto in cui un presidio smette di presidiare.
    const colonne = await asOwner(async (c) =>
      (
        await c.query<{ n: string }>(
          `select column_name as n from information_schema.columns
            where table_schema = 'public' and table_name = 'annuncio' order by 1`,
        )
      ).rows.map((x) => x.n),
    )
    expect(colonne).toEqual(['creato', 'giorni', 'id'])
    // Compagna positiva: senza, le tre asserzioni di vuoto qui sotto
    // resterebbero verdi anche se il trigger smettesse di annunciare.
    expect(
      await asOwner(async (c) => (await c.query<{ n: number }>('select count(*)::int as n from annuncio')).rows[0].n),
    ).toBeGreaterThan(0)
    const testo = await asOwner(async (c) =>
      JSON.stringify((await c.query<{ r: unknown }>('select to_jsonb(a) as r from annuncio a order by id')).rows),
    )
    expect(testo).not.toContain('Maria')
    expect(testo).not.toContain(CLIENT_MARIA)
    expect(testo).not.toContain('+39')
  })

  it('non lascia scrivere gli annunci a un operatrice per via diretta', async () => {
    const codice = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await c.query("insert into annuncio (giorni) values (array['2026-01-01'::date])")
        return 'nessun errore'
      } catch (e) {
        return (e as { code?: string }).code
      }
    }).catch((e) => (e as { code?: string }).code)
    expect(codice).toBe('42501')
  })

  it('lascia leggere gli annunci a un operatrice attiva e non a un estranea', async () => {
    await scrivi()
    const vera = await asOperatorCommit(VERA_AUTH, async (c) => (await c.query('select id from annuncio')).rows.length)
    const estranea = await asOperatorCommit(OUTSIDER_AUTH, async (c) =>
      (await c.query('select id from annuncio')).rows.length,
    )
    expect(vera).toBeGreaterThan(0)
    expect(estranea).toBe(0)
  })
})

describe('annunci, dal lato del telefono', () => {
  it('arriva al telefono di un operatrice attiva', async () => {
    const sessione = await accedi('vera@example.test')
    const ascoltatore = await ascolta(sessione.accessToken)
    expect(ascoltatore.stato()).toBe('iscritto')
    await scrivi()
    const ricevuti = await ascoltatore.attendi()
    expect(JSON.stringify(ricevuti)).toContain(DAY_ONE)
  })

  // Le tre prove negative hanno DENTRO la loro compagna positiva: un
  // ascoltatore attivo che riceve nello stesso istante. Senza, resterebbero
  // verdi anche se il canale fosse muto per tutti, ed è esattamente il modo in
  // cui una prova negativa smette di provare qualcosa.
  it('non arriva a un account che non è operatrice, mentre arriva a un operatrice attiva', async () => {
    const estraneo = await accedi('outsider@example.test')
    const vera = await accedi('vera@example.test')
    const sordo = await ascolta(estraneo.accessToken, 3000)
    const udente = await ascolta(vera.accessToken, 3000)
    expect(udente.stato()).toBe('iscritto')
    await scrivi()
    const ricevutiDaVera = await udente.attendi()
    const ricevutiDaEstraneo = await sordo.attendi()
    expect(JSON.stringify(ricevutiDaVera)).toContain(DAY_ONE)
    expect(ricevutiDaEstraneo).toEqual([])
  })

  it('non arriva a un operatrice disattivata, mentre arriva a una attiva', async () => {
    const annalisa = await accedi('annalisa@example.test')
    const vera = await accedi('vera@example.test')
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const sorda = await ascolta(annalisa.accessToken, 3000)
    const udente = await ascolta(vera.accessToken, 3000)
    await scrivi()
    const ricevutiDaVera = await udente.attendi()
    const ricevutiDaAnnalisa = await sorda.attendi()
    expect(JSON.stringify(ricevutiDaVera)).toContain(DAY_ONE)
    expect(ricevutiDaAnnalisa).toEqual([])
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    dimenticaSessioni()
  })

  it('non arriva a chi si presenta con la sola chiave pubblica, mentre arriva a un operatrice', async () => {
    const vera = await accedi('vera@example.test')
    const udente = await ascolta(vera.accessToken, 3000)
    const client = createClient(URL, ANON)
    const ricevuti: unknown[] = []
    const canale = client
      .channel('annunci-anon')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annuncio' }, (m) => ricevuti.push(m.new))
    await new Promise<void>((r) => canale.subscribe(() => r()))
    await scrivi()
    const ricevutiDaVera = await udente.attendi()
    await new Promise((r) => setTimeout(r, 1000))
    await client.removeAllChannels()
    expect(JSON.stringify(ricevutiDaVera)).toContain(DAY_ONE)
    expect(ricevuti).toEqual([])
  })
})
