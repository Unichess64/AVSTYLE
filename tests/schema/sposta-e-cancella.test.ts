// tests/schema/sposta-e-cancella.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  VERA,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOperatorCommit,
  asOwner,
  connect,
  pgCode,
  resetData,
} from '../helpers/db'
import { dimenticaSessioni, sessioneDi } from '../helpers/sessioni'
import { CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

// REGOLA DI QUESTO FILE, la stessa di `salva-visita.test.ts`: ogni prova che
// scrive e poi rilegge da un'altra connessione, o che incatena due invii, usa
// `asOperatorCommit`. `asOperator` chiude sempre con un rollback, e al Task 4
// una prova così era verde e completamente MUTA.

const V1 = '50000000-0000-4000-8000-0000000000d1'
const A1 = '60000000-0000-4000-8000-0000000000d1'
const A2 = '60000000-0000-4000-8000-0000000000d2'
let seq = 0
const codice = () => `70000000-0000-4000-8000-1${String(++seq).padStart(11, '0')}`

type Appuntamento = {
  id: string
  versione: string
  operatrice: string
  servizio: string
  inizio: number
  durata: number
}
type Stato = { visita: string; data: string; cliente: string; appuntamenti: Appuntamento[] }
type Risposta = { esito: string; visita?: string; appuntamenti?: { id: string; versione: string }[]; stato?: Stato }

const crea = () =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: Risposta }>('select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r', [
      codice(),
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([
        { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
        { id: A2, operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 140, durata: 10 },
      ]),
    ])
    return r.rows[0].r
  })

const inizi = () =>
  asOwner(async (c) => {
    const r = await c.query<{ id: string; s: number; d: string }>(
      'select id, start_cell as s, appointment_date::text as d from appointment order by id',
    )
    return r.rows
  })

/**
 * Gli esiti registrati in `invio` per un codice. Restituisce l'ARRAY e non il
 * primo valore: così la prova può asserire che la riga c'è ed è una sola, e un
 * registro vuoto non passa per un esito sbagliato.
 */
const esitiDi = (cod: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [cod])
    return r.rows.map((x) => x.e)
  })

/** Le versioni come `p_attesi` le vuole: proiettate su {id, versione} e in ordine di id (spec §4.1 regola 6). */
const proietta = (a: Appuntamento[]) =>
  a.map((x) => ({ id: x.id, versione: x.versione })).sort((p, q) => p.id.localeCompare(q.id))

/**
 * Aspetta che la connessione data sia ferma su un blocco. Si aspetta la
 * CONDIZIONE e non un tempo: un `setTimeout` fisso rende rosse le prove di
 * concorrenza quando la macchina è lenta, senza che ci sia un difetto sotto.
 * Copiata da `salva-visita.test.ts`, dove il margine misurato è 400-550×.
 */
async function attendiBlocco(c: import('pg').Client, ms = 5000) {
  const pid = (c as unknown as { processID: number }).processID
  const fine = Date.now() + ms
  while (Date.now() < fine) {
    const fermo = await asOwner(
      async (o) =>
        (
          await o.query<{ n: number }>(
            "select count(*)::int as n from pg_stat_activity where pid = $1 and wait_event_type = 'Lock'",
            [pid],
          )
        ).rows[0].n,
    )
    if (fermo > 0) return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error('attendiBlocco: la connessione non si è mai fermata su un blocco')
}

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('sposta_visita_a', () => {
  it('sposta tutti gli appuntamenti alle destinazioni date', async () => {
    const creata = await crea()
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(r.esito).toBe('salvata')
    expect((await inizi()).map((x) => x.s)).toEqual([126, 146])
  })

  it('ripetuto con le versioni nuove non sposta due volte', async () => {
    const creata = await crea()
    const primo = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    const secondo = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        primo.visita,
        JSON.stringify(primo.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(secondo.esito).toBe('salvata')
    expect((await inizi()).map((x) => x.s)).toEqual([126, 146])
  })

  it('porta la visita a un altro giorno', async () => {
    const creata = await crea()
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select sposta_visita_a($1,$2,$3::date,$4,$5,$6)', [
        codice(),
        V1,
        DAY_TWO,
        JSON.stringify([{ id: A1, inizio: 120 }, { id: A2, inizio: 140 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ]),
    )
    expect((await inizi()).map((x) => x.d)).toEqual([DAY_TWO, DAY_TWO])
  })

  it('rifiuta un insieme di destinazioni diverso da quello atteso', async () => {
    const creata = await crea()
    const codiceErrore = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await c.query('select sposta_visita_a($1,$2,$3::date,$4,$5,$6)', [
          codice(),
          V1,
          DAY_ONE,
          JSON.stringify([{ id: A1, inizio: 126 }]),
          creata.visita,
          JSON.stringify(creata.appuntamenti),
        ])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('22023')
  })

  it('risponde modificata_altrove se una collega ha toccato la visita', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('update appointment set start_cell = 160 where id = $1', [A2]))
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(r.esito).toBe('modificata_altrove')
    expect((await inizi()).map((x) => x.s)).toEqual([120, 160])
  })

  // ⚠︎ IL GIRO DI RIPRESA, che al Task 5 nessuna prova faceva.
  //
  // `sposta_visita_a` restituisce `stato` su `modificata_altrove` esattamente
  // come `salva_visita`, ed è il SECONDO dei tre consumatori di
  // `public.stato_visita`. Alla consegna del Task 5, dentro `stato_visita`,
  // mettere a costante le versioni degli appuntamenti dava 0 rosse su 347 e
  // annullare `operatrice`/`servizio` altre 0: erano i campi che non servono a
  // MOSTRARE la visita ma a RISCRIVERLA, e non li leggeva nessuno. Misurato di
  // nuovo il 25/09/2026 con le sole dieci prove del Passo 1 di questo task: 2
  // rosse e 1 rossa, TUTTE in `salva-visita.test.ts`, nessuna qui. Senza questa
  // prova il presidio nascerebbe morto nel secondo consumatore.
  //
  // Il giro è quello che design 3a §4.4 impone alla scheda: dopo
  // `modificata_altrove` «prende lo stato corrente e le sue versioni, che
  // diventano quelle di partenza». Per uno SPOSTAMENTO i sei campi servono
  // tutti: `operatrice`, `servizio` e `durata` ridisegnano i blocchi,
  // `inizio` è la base su cui l'app ricalcola la destinazione assoluta
  // conservando gli scarti (§4.1), e `versione` più `stato.visita` diventano
  // l'atteso del secondo invio.
  it('il giro si chiude: dopo modificata_altrove la scheda riparte dallo stato e sposta', async () => {
    const creata = await crea()
    // Una collega sposta il massaggio: la scheda di Vera è sulle versioni
    // vecchie e il suo primo trascinamento deve rimbalzare.
    await asOwner((c) => c.query('update appointment set start_cell = 160 where id = $1', [A2]))
    const primo = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(primo.esito).toBe('modificata_altrove')

    // La scheda si ridisegna da `stato`: è QUI che i campi muti vengono letti.
    // Gemella positiva delle asserzioni che seguono: senza, uno `stato` con i
    // campi a null passerebbe ogni riga sotto.
    const dallaScheda = primo.stato!.appuntamenti
    expect(dallaScheda).toHaveLength(2)
    expect(dallaScheda.find((x) => x.id === A2)).toEqual({
      id: A2,
      versione: expect.any(String),
      operatrice: ALESSANDRA,
      servizio: SERVICE_MASSAGE,
      inizio: 160,
      durata: 10,
    })

    // L'app ricalcola il trascinamento di +6 celle sulle posizioni CORRENTI,
    // non su quelle che aveva in mano: è la destinazione assoluta di §4.1, e
    // legge `inizio` dallo stato.
    const destinazioni = dallaScheda.map((x) => ({ id: x.id, inizio: x.inizio + 6 }))
    const secondo = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify(destinazioni),
        primo.stato!.visita,
        JSON.stringify(proietta(dallaScheda)),
      ])
      return x.rows[0].r
    })
    expect(secondo.esito).toBe('salvata')
    expect((await inizi()).map((x) => x.s)).toEqual([126, 166])
    // Il massaggio è ancora di Alessandra: il giro non gliel'ha tolto.
    const chi = await asOwner(async (c) => {
      const r = await c.query<{ op: string }>('select operator_id as op from appointment where id = $1', [A2])
      return r.rows[0].op
    })
    expect(chi).toBe(ALESSANDRA)
  })

  // La gemella della prova omonima in `cancella_visita`: stessa riga, seconda
  // delle sue tre copie, stesso danno. Vedi là il commento lungo sul perché il
  // blocco sulla VISITA non basta. Misurato il 25/09/2026: senza questa prova,
  // togliere la riga da `sposta_visita_a` dava 0 rosse su 368 — come la dava
  // togliendola da `0016`, che resta scoperta e non è di questo task.
  //
  // Qui il danno è che lo spostamento riscrive `start_cell` sopra la modifica
  // della collega senza mai accorgersene: esito `salvata` invece di
  // `modificata_altrove`, misurato.
  it('il blocco degli appuntamenti fa vedere una modifica arrivata dopo il blocco della visita', async () => {
    const creata = await crea()
    const guardiano = await connect()
    const scrittore = await connect()
    const sessione = await sessioneDi(VERA_AUTH)
    let esito = 'nessun errore'
    try {
      await guardiano.query('begin')
      await guardiano.query('update appointment set start_cell = 160 where id = $1', [A2])

      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      const inCoda = scrittore
        .query('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
          codice(),
          V1,
          DAY_ONE,
          JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
          creata.visita,
          JSON.stringify(creata.appuntamenti),
        ])
        .then((r) => (r.rows[0] as { r: Risposta }).r.esito)
        .catch((e) => pgCode(e) ?? 'ignoto')

      await attendiBlocco(scrittore)
      await guardiano.query('commit')
      esito = await inCoda
      await scrittore.query('commit')
    } finally {
      await guardiano.end()
      await scrittore.end()
      dimenticaSessioni()
    }
    expect(esito).toBe('modificata_altrove')
    // Gemella positiva: niente si è mosso, e il massaggio è dove l'ha messo la
    // collega. Senza queste righe un `modificata_altrove` arrivato per una
    // ragione qualunque passerebbe lo stesso.
    expect((await inizi()).map((x) => [x.id, x.s])).toEqual([
      [A1, 120],
      [A2, 160],
    ])
  })

  // ⚠︎ IL REGISTRO DEGLI INVII NON AVEVA NESSUN LETTORE, ed è il reperto su cui
  // le due revisioni avversariali del 25/09/2026 sono convergute da lati
  // diversi — l'empirica dalla mutazione, l'a secco dal contratto.
  //
  // Misurato: falsificare ciò che queste due funzioni REGISTRANO in `invio`,
  // lasciando giusto il valore che RESTITUISCONO, dava **0 rosse su 369** in
  // tutte e tre le forme provate (registrare 'salvata' al posto di
  // 'modificata_altrove'; 'salvata' al posto di 'cancellata'; 'non_trovata' al
  // posto di 'gia_cancellata'). Nessuna prova della suite leggeva
  // `invio.esito` dopo `sposta_visita_a` o `cancella_visita`.
  //
  // È l'UNICO ingresso su cui «Controlla» (§4.4, Task 7) decide fra le sue sei
  // righe: il telefono che non ha ricevuto risposta non sa niente della visita,
  // sa solo il proprio codice d'invio. Con l'esito falsificato, «Controlla»
  // risponderebbe «✓ Risulta salvata» a un invio che non ha scritto una riga —
  // riprodotto su banco usa e getta con i tre soli ingressi del Task 7.
  it('registra nel registro degli invii lo stesso esito che restituisce', async () => {
    const creata = await crea()
    const cod1 = codice()
    const salvata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        cod1,
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(salvata.esito).toBe('salvata')
    expect(await esitiDi(cod1)).toEqual(['salvata'])

    // E l'altro ramo: un invio che NON scrive niente non deve lasciare dietro
    // un esito che dica il contrario.
    const cod2 = codice()
    const rimbalzata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        cod2,
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 130 }, { id: A2, inizio: 150 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(rimbalzata.esito).toBe('modificata_altrove')
    expect(await esitiDi(cod2)).toEqual(['modificata_altrove'])
  })

  // ⚠︎ I DUE RAMI CHE NESSUNA PROVA ESERCITAVA. Misurato: cambiare
  // `cancellata_altrove` in `non_trovata` dentro `sposta_visita_a` dava **0
  // rosse su 369** — nessuna prova dava a questa funzione una visita cancellata
  // né una mai esistita.
  //
  // I due esiti non sono intercambiabili: §4.1 dà a `cancellata_altrove` il
  // messaggio «È stata cancellata da un'altra parte» e a `non_trovata` il
  // ricontrollo dell'account di §4.3 passo 7, cioè «account chiuso, oppure
  // questa visita non esiste più». Percorso raggiungibile: trascinare il blocco
  // di una visita che una collega ha appena cancellato.
  it('distingue una visita cancellata da una mai esistita', async () => {
    const creata = await crea()
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select cancella_visita($1,$2,$3,$4)', [codice(), V1, creata.visita, JSON.stringify(creata.appuntamenti)]),
    )
    const cancellata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(cancellata.esito).toBe('cancellata_altrove')

    // La gemella che rende i due esiti distinguibili: stessa chiamata, ma su un
    // id che non è MAI esistito e quindi non è fra le cancellate. Senza questa
    // riga, i due rami potrebbero restituire lo stesso valore e la prova sopra
    // resterebbe verde.
    const maiEsistita = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        '50000000-0000-4000-8000-0000000000fe',
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }]),
        '2026-03-12T08:00:00.000000Z',
        '[]',
      ])
      return x.rows[0].r
    })
    expect(maiEsistita.esito).toBe('non_trovata')
  })

  // ⚠︎ L'ALTRA META del contratto di `p_attesi`, che questo file USAVA senza
  // PIANTARE: misurato, rendere insiemistico il confronto della regola 6 dentro
  // 0017 dava **0 rosse su 369**, e togliere `order by a.id` da `v_correnti`
  // nelle due copie nuove ne dava altre **0**. Le tre prove che lo piantano
  // stanno tutte in `salva-visita.test.ts` e guardano solo 0016.
  //
  // L'asse su cui l'`order by` si uccide NON è l'aggiornamento — gli UPDATE
  // sono HOT e l'indice conserva l'ordine — ma l'INSERIMENTO: gli id vengono da
  // `crypto.randomUUID()` sul telefono (§4.4), quindi l'ordine in cui la scheda
  // crea i blocchi non ha nessuna relazione con quello dei loro id.
  it('tiene l ordine quando gli appuntamenti sono creati in ordine di id decrescente, e confronta l insieme in ordine di id', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const r = await c.query<{ r: Risposta }>('select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r', [
        codice(),
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        // A2 PRIMA di A1: l'ordine fisico delle righe è l'inverso di quello
        // degli id, ed è l'unica forma in cui l'`order by` morde.
        JSON.stringify([
          { id: A2, operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 140, durata: 10 },
          { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
        ]),
      ])
      return r.rows[0].r
    })
    // Precondizione asserita: la funzione restituisce comunque in ordine di id,
    // altrimenti questa prova misurerebbe l'ordine di `salvata.appuntamenti`
    // invece di quello di `v_correnti`.
    expect(creata.appuntamenti!.map((a) => a.id)).toEqual([A1, A2])

    // Prima metà: l'insieme atteso INVERTITO deve rimbalzare. Il confronto è un
    // `is distinct from` fra array jsonb, quindi posizionale (spec §4.1 regola
    // 6): chi lo rendesse insiemistico farebbe arrossire questa riga, ed è
    // voluto — dovrebbe togliere anche il contratto dalla spec, invece di
    // lasciare i due documenti a contraddirsi.
    const invertito = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify([...creata.appuntamenti!].reverse()),
      ])
      return x.rows[0].r
    })
    expect(invertito.esito).toBe('modificata_altrove')

    // Gemella positiva: proiettato e ordinato, lo STESSO spostamento passa — ed
    // è la riga che uccide la perdita dell'`order by` in `v_correnti`.
    const ok = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify([...creata.appuntamenti!].sort((p, q) => p.id.localeCompare(q.id))),
      ])
      return x.rows[0].r
    })
    expect(ok.esito).toBe('salvata')
    expect((await inizi()).map((x) => x.s)).toEqual([126, 146])
  })
})

describe('cancella_visita', () => {
  const cancella = (creata: Risposta, cod = codice()) =>
    asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select cancella_visita($1,$2,$3,$4) as r', [
        cod,
        V1,
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })

  it('cancella la visita e i suoi appuntamenti', async () => {
    const creata = await crea()
    const r = await cancella(creata)
    expect(r.esito).toBe('cancellata')
    expect(await inizi()).toEqual([])
  })

  it('registra la visita fra le cancellate', async () => {
    const creata = await crea()
    await cancella(creata)
    const righe = await asOwner(async (c) => {
      const x = await c.query<{ id: string }>('select id from visita_cancellata')
      return x.rows.map((y) => y.id)
    })
    expect(righe).toEqual([V1])
  })

  it('risponde gia_cancellata su una visita che non c è più e risulta cancellata', async () => {
    const creata = await crea()
    await cancella(creata)
    const r = await cancella(creata)
    expect(r.esito).toBe('gia_cancellata')
  })

  it('risponde non_trovata su una visita mai esistita', async () => {
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select cancella_visita($1,$2,$3,$4) as r', [
        codice(),
        '50000000-0000-4000-8000-0000000000ff',
        '2026-03-12T08:00:00.000000Z',
        '[]',
      ])
      return x.rows[0].r
    })
    expect(r.esito).toBe('non_trovata')
  })

  it('non cancella se una collega ha aggiunto un servizio nel frattempo', async () => {
    const creata = await crea()
    await asOwner((c) =>
      c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ('60000000-0000-4000-8000-0000000000d3', $1, $2, $3, $4::date, 200, 12)`,
        [V1, VERA, SERVICE_REFILL, DAY_ONE],
      ),
    )
    const r = await cancella(creata)
    expect(r.esito).toBe('modificata_altrove')
    expect((await inizi()).length).toBe(3)
  })

  // Il TERZO consumatore di `public.stato_visita`, stessa ragione della prova
  // gemella in `sposta_visita_a`: vedi il commento lungo là sopra. Qui il giro
  // di §4.4 è «una collega ha toccato la visita → la scheda la ridisegna →
  // l'operatrice guarda che cosa sta cancellando e conferma».
  it('il giro si chiude: dopo modificata_altrove la scheda riparte dallo stato e cancella', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('update appointment set start_cell = 160 where id = $1', [A2]))
    const primo = await cancella(creata)
    expect(primo.esito).toBe('modificata_altrove')

    // La scheda mostra che cosa c'è davvero prima che l'operatrice confermi.
    const dallaScheda = primo.stato!.appuntamenti
    expect(dallaScheda).toHaveLength(2)
    expect(dallaScheda.find((x) => x.id === A2)).toEqual({
      id: A2,
      versione: expect.any(String),
      operatrice: ALESSANDRA,
      servizio: SERVICE_MASSAGE,
      inizio: 160,
      durata: 10,
    })

    const secondo = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select cancella_visita($1,$2,$3,$4) as r', [
        codice(),
        V1,
        primo.stato!.visita,
        JSON.stringify(proietta(dallaScheda)),
      ])
      return x.rows[0].r
    })
    expect(secondo.esito).toBe('cancellata')
    expect(await inizi()).toEqual([])
  })

  // ⚠︎ IL BLOCCO DELLA REGOLA 2 SUGLI APPUNTAMENTI, che al Task 5 non aveva
  // nessun presidio: togliendo l'intera riga `perform 1 … for update` da
  // `0016` si misuravano 0 rosse su 347, perché le due prove di concorrenza di
  // quel file bloccano la riga della VISITA e quella della CLIENTE, mai un
  // appuntamento. Questo task ne fa altre due copie, e la riga resterebbe con
  // tre copie e zero presìdi (appendice del Task 5, reperto 3).
  //
  // La ragione per cui il blocco sulla visita NON basta: serializza i due
  // scrittori che passano dalle funzioni, ma non chi tocca un appuntamento
  // senza passare dalla visita — ed è quello che fa la cascata, ed è quello che
  // farà `controlla_invio` domani. Senza il blocco, la lettura di `v_correnti`
  // vede la fotografia VECCHIA (`read committed`), il confronto della regola 6
  // passa, e la DELETE si ferma sul lock dell'appuntamento: quando si libera,
  // cancella un servizio che nel frattempo è cambiato, e l'operatrice legge
  // `cancellata`. Con il blocco, la rilettura è successiva al commit della
  // collega e l'esito è `modificata_altrove`.
  it('il blocco degli appuntamenti fa vedere la modifica di una collega arrivata dopo il blocco della visita', async () => {
    const creata = await crea()
    const guardiano = await connect()
    const scrittore = await connect()
    const sessione = await sessioneDi(VERA_AUTH)
    let esito = 'nessun errore'
    try {
      // 1. la collega cambia il massaggio e NON committa. Tocca l'appuntamento,
      //    non la visita: il blocco della regola 2 sulla visita non la vede.
      await guardiano.query('begin')
      await guardiano.query('update appointment set start_cell = 160 where id = $1', [A2])

      // 2. Vera cancella la visita con le versioni che aveva in mano, che sono
      //    ancora quelle giuste per chiunque non veda la scrittura in corso.
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      const inCoda = scrittore
        .query('select cancella_visita($1,$2,$3,$4) as r', [
          codice(),
          V1,
          creata.visita,
          JSON.stringify(creata.appuntamenti),
        ])
        .then((r) => (r.rows[0] as { r: Risposta }).r.esito)
        .catch((e) => pgCode(e) ?? 'ignoto')

      // 3. si aspetta la CONDIZIONE e non un tempo. Nota: la connessione si
      //    ferma su un blocco in TUTTI E DUE i casi — con la riga, sul `for
      //    update`; senza, sulla DELETE in cascata — quindi questa attesa non
      //    è ciò che fa passare la prova.
      await attendiBlocco(scrittore)
      await guardiano.query('commit')
      esito = await inCoda
      await scrittore.query('commit')
    } finally {
      await guardiano.end()
      await scrittore.end()
      dimenticaSessioni()
    }
    expect(esito).toBe('modificata_altrove')
    // Gemella positiva dell'esito: la visita e il servizio della collega sono
    // ancora lì. Senza queste due righe un `modificata_altrove` arrivato per
    // una ragione qualunque passerebbe lo stesso.
    expect((await inizi()).map((x) => [x.id, x.s])).toEqual([
      [A1, 120],
      [A2, 160],
    ])
  })

  // La gemella della prova omonima in `sposta_visita_a`: vedi là il commento
  // lungo sul registro degli invii, il reperto su cui le due revisioni
  // avversariali sono convergute. Qui i due esiti che nessun altro leggeva sono
  // `cancellata` e `gia_cancellata` — e sono anche i due che la tabella delle
  // sei righe di §4.4 non nomina, cosa che il Task 7 deve chiudere nella spec
  // prima di scrivere 0018.
  it('registra nel registro degli invii lo stesso esito che restituisce', async () => {
    const creata = await crea()
    const cod1 = codice()
    const prima = await cancella(creata, cod1)
    expect(prima.esito).toBe('cancellata')
    expect(await esitiDi(cod1)).toEqual(['cancellata'])

    const cod2 = codice()
    const seconda = await cancella(creata, cod2)
    expect(seconda.esito).toBe('gia_cancellata')
    expect(await esitiDi(cod2)).toEqual(['gia_cancellata'])
  })
})

// ⚠︎ `catalogue-audit.test.ts` enumera `pg_class.relacl` e filtra le funzioni
// su `prosecdef`: queste due sono `invoker`, quindi NESSUN audit permanente le
// guarda (appendice del Task 5, reperto 5). Lo stringimento è del Task 9; fino
// ad allora i permessi si presidiano a mano, per nome di ruolo, con la gemella
// positiva accanto. Stessa forma delle quattro prove di `salva-visita.test.ts`.
describe('permessi delle due funzioni nuove', () => {
  const FIRMA_SPOSTA = 'public.sposta_visita_a(uuid, uuid, date, jsonb, text, jsonb)'
  const FIRMA_CANCELLA = 'public.cancella_visita(uuid, uuid, text, jsonb)'

  // ⚠ discriminante: a differenza di `stato_visita`, che è senza guardia, qui
  // la chiamata da `anon` NON distingue «EXECUTE revocato» da «EXECUTE concesso
  // e la guardia in testa risponde»: `app.is_active_operator()` solleva 42501
  // in tutti e due i casi, su tutte e due le funzioni. Il discriminante è
  // `has_function_privilege`, che vede anche una concessione a PUBLIC.
  //
  // ⚠ E il `grant execute … to authenticated` della migrazione è RIDONDANTE
  // (misurato al Task 4 e confermato al Task 5): in `public` c'è un
  // `alter default privileges` di Supabase, da due concedenti, che concede
  // EXECUTE ad anon, authenticated e service_role su ogni funzione nuova. La
  // riga che porta davvero è il `revoke … from public, anon`, ed è quella che
  // le due righe negative qui sotto presidiano.
  it('nega EXECUTE ad anon e a public su tutte e due, e lo concede ad authenticated', async () => {
    const privilegi = await asOwner(async (c) => {
      const r = await c.query<{ f: string; ruolo: string; puo: boolean }>(
        `select f, ruolo, has_function_privilege(ruolo, f, 'EXECUTE') as puo
           from unnest(array[$1::text, $2::text]) as f,
                unnest(array['anon', 'public', 'authenticated']) as ruolo
          order by f, ruolo`,
        [FIRMA_SPOSTA, FIRMA_CANCELLA],
      )
      return r.rows
    })
    // Sei righe, non «nessuna riga»: un elenco vuoto passerebbe qualunque
    // asserzione sul contenuto. Un nome di ruolo inesistente solleva 42704 e
    // una firma sbagliata 42883, quindi la riga non è inerte.
    expect(privilegi).toHaveLength(6)
    expect(privilegi.filter((x) => !x.puo).map((x) => `${x.f}/${x.ruolo}`).sort()).toEqual(
      [
        `${FIRMA_SPOSTA}/anon`,
        `${FIRMA_SPOSTA}/public`,
        `${FIRMA_CANCELLA}/anon`,
        `${FIRMA_CANCELLA}/public`,
      ].sort(),
    )
    expect(privilegi.filter((x) => x.puo).map((x) => x.f).sort()).toEqual([FIRMA_SPOSTA, FIRMA_CANCELLA].sort())
  })

  // Due `asAnon` separate e non due query nella stessa: la prima che fallisce
  // aborta la transazione, e la seconda tornerebbe `25P02` — cioè una prova che
  // non guarda più la funzione che dice di guardare (misurato al Task 5).
  it('e ad anon la chiamata diretta risponde 42501, non un esito di dominio', async () => {
    const prova = (sql: string, args: unknown[]) =>
      asAnon(async (c) => {
        try {
          await c.query(sql, args)
          return 'nessun errore'
        } catch (e) {
          return pgCode(e)
        }
      })
    const sposta = await prova('select sposta_visita_a($1,$2,$3::date,$4,$5,$6)', [
      codice(),
      V1,
      DAY_ONE,
      JSON.stringify([{ id: A1, inizio: 126 }]),
      '2026-03-12T08:00:00.000000Z',
      '[]',
    ])
    const cancella = await prova('select cancella_visita($1,$2,$3,$4)', [
      codice(),
      V1,
      '2026-03-12T08:00:00.000000Z',
      '[]',
    ])
    expect(sposta).toBe('42501')
    expect(cancella).toBe('42501')
  })

  // La gemella POSITIVA delle due prove qui sopra: senza, revocare EXECUTE
  // anche ad `authenticated` lascerebbe verdi le due righe negative.
  it('ma un operatrice attiva le esegue davvero tutte e due', async () => {
    const creata = await crea()
    const spostata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_TWO,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(spostata.esito).toBe('salvata')
    expect((await inizi()).map((x) => x.d)).toEqual([DAY_TWO, DAY_TWO])
    const cancellata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select cancella_visita($1,$2,$3,$4) as r', [
        codice(),
        V1,
        spostata.visita,
        JSON.stringify(spostata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(cancellata.esito).toBe('cancellata')
    expect(await inizi()).toEqual([])
  })

  // Senza questa riga, togliere `set search_path = ''` non renderebbe rossa
  // nessuna prova: l'audit di catalogo non guarda le funzioni invoker.
  it('sono security invoker, con search_path vuoto, e tutte e due volatile', async () => {
    const righe = await asOwner(async (c) => {
      const r = await c.query<{ nome: string; sicurezza: boolean; volatilita: string; config: string[] | null }>(
        `select p.proname as nome, p.prosecdef as sicurezza, p.provolatile as volatilita, p.proconfig as config
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname in ('sposta_visita_a', 'cancella_visita')
          order by p.proname`,
      )
      return r.rows
    })
    expect(righe.map((x) => x.nome)).toEqual(['cancella_visita', 'sposta_visita_a'])
    expect(righe.filter((x) => x.sicurezza)).toEqual([])
    expect(righe.map((x) => x.config)).toEqual([['search_path=""'], ['search_path=""']])
    expect(righe.map((x) => x.volatilita)).toEqual(['v', 'v'])
  })
})
