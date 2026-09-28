// tests/schema/annunci.test.ts
import { REALTIME_SUBSCRIBE_STATES, createClient } from '@supabase/supabase-js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
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

  // ⚠︎ Le tre prove che seguono nascono dalla revisione empirica del 28/09/2026,
  // che ha misurato un buco che nessuna delle due revisioni aveva previsto:
  // QUATTRO trigger su sei si potevano cancellare con ZERO rosse su 408. I due
  // `_del` erano gli unici con una vittima, e la prendevano per CONTEGGIO (3
  // invece di 2), non per contenuto. Qui si presidiano i percorsi veri.

  it('annuncia uno spostamento nello STESSO giorno, che è il gesto centrale dell agenda', async () => {
    // D3-15: il trascinamento è solo VERTICALE, quindi il gesto più comune non
    // cambia data. Questa prova presidia il PERCORSO — «un'ora diversa deve
    // annunciare» —, non un trigger: `sposta_visita_a` tocca anche `visit`
    // (`visit_touch` è incondizionato, 0004:52-53), quindi due rami annunciano
    // lo stesso giorno e si coprono a vicenda. Misurato il 28/09/2026: togliere
    // il solo `zz_annuncia_appuntamenti_upd` la lascia VERDE; servono via tutti
    // e due gli `_upd` perché cada (3 rosse). È lo stesso gemello speculare per
    // cui la sonda 2 del piano non ha vittime su un ramo solo.
    // A isolare il trigger degli appuntamenti è la prova dello SCAMBIO, qui
    // sotto: è l'unico percorso che scrive su `appointment` senza toccare
    // `visit`.
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
        DAY_ONE, // la STESSA data: cambia solo l'ora
        JSON.stringify([{ id: A1, inizio: 160 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ]),
    )
    // Compagna positiva dentro la prova: che sia partito QUALCOSA e che sia il
    // giorno giusto. Un `length > 0` da solo resterebbe verde con un annuncio
    // vuoto o con il giorno sbagliato.
    const righe = await annunci()
    expect(righe.length).toBeGreaterThan(0)
    expect([...new Set(righe.flat())]).toEqual([DAY_ONE])
  })

  it('annuncia uno scambio di operatrici, che non tocca né la data né l orario', async () => {
    // `swap_appointment_operators` è eseguibile da `authenticated` e scrive solo
    // `operator_id`: nessuna data cambia e `visit` non viene toccata, quindi
    // questo è l'UNICO percorso che isola `zz_annuncia_appuntamenti_upd`.
    // Misurato: togliendo quel solo trigger, questa è l'unica rossa su 412 —
    // prima di questa prova ne dava ZERO, e il telefono della collega mostrava
    // l'appuntamento con l'operatrice sbagliata senza che nulla se ne accorgesse. Due appuntamenti alla STESSA
    // cella con operatrici diverse: `appointment_slot_unique` vincola per
    // operatrice, non per salone.
    const A2 = '60000000-0000-4000-8000-0000000000f4'
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod(),
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([
          { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
          { id: A2, operatrice: ANNALISA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
        ]),
      ]),
    )
    await asOwner((c) => c.query('delete from annuncio'))
    await asOperatorCommit(VERA_AUTH, (c) => c.query('select swap_appointment_operators($1,$2)', [A1, A2]))
    const righe = await annunci()
    expect(righe.length).toBeGreaterThan(0)
    expect([...new Set(righe.flat())]).toEqual([DAY_ONE])
  })

  it('due visite cancellate con UNA istruzione lasciano un annuncio per istruzione anche sul ramo delle visite', async () => {
    // La prova della cascata qui sopra cancella UNA visita, e su una riga sola
    // «per istruzione» e «per riga» coincidono: misurato che portare i tre
    // trigger di `visit` a `for each row` dà 0 rosse. Servono DUE visite in una
    // sola istruzione perché i due regimi si separino.
    const V2 = '50000000-0000-4000-8000-0000000000f5'
    const A2 = '60000000-0000-4000-8000-0000000000f6'
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod(), V1, CLIENT_MARIA, DAY_ONE,
        JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
      ]),
    )
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod(), V2, CLIENT_LUCIA, DAY_TWO,
        JSON.stringify([{ id: A2, operatrice: ANNALISA, servizio: SERVICE_REFILL, inizio: 200, durata: 12 }]),
      ]),
    )
    await asOwner((c) => c.query('delete from annuncio'))
    await asOwner((c) => c.query('delete from visit where id in ($1,$2)', [V1, V2]))
    // Il ramo `visit` per istruzione lascia UNA riga con TUTTI E DUE i giorni;
    // per riga ne lascerebbe due con uno ciascuna. Si asserisce la forma, non
    // solo il numero: un conteggio da solo non distingue una sorgente spenta e
    // l'altra raddoppiata.
    const righe = await annunci()
    expect(righe.filter((g) => g.includes(DAY_ONE) && g.includes(DAY_TWO)).length).toBe(2)
    expect(righe.every((g) => g.length === 2)).toBe(true)
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

  it('la chiusura di un invio porta via gli annunci più vecchi di un ora e lascia i nuovi', async () => {
    // La terza pulizia di `app.chiudi_invio` (0019) non era presidiata da
    // niente: toglierla dava 0 rosse su 408. Sta lì e non nel trigger perché il
    // trigger gira da 2 a 5 volte per salvataggio, `chiudi_invio` una volta per
    // INVIO.
    const vecchio = await asOwner(async (c) =>
      (
        await c.query<{ id: string }>(
          `insert into annuncio (giorni, creato)
           values (array['2020-01-01'::date], now() - interval '2 hours') returning id`,
        )
      ).rows[0].id,
    )
    await scrivi() // salva_visita → chiudi_invio → la terza delete
    const rimasti = await asOwner(async (c) =>
      (await c.query<{ id: string }>('select id from annuncio order by id')).rows.map((x) => x.id),
    )
    expect(rimasti).not.toContain(vecchio)
    // Compagna positiva: senza, la prova resterebbe verde anche se la delete
    // svuotasse la tabella intera, o se il trigger smettesse di annunciare.
    expect(rimasti.length).toBeGreaterThan(0)
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
