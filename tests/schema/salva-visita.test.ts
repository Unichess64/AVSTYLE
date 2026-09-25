// tests/schema/salva-visita.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  ANNALISA,
  VERA,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOperatorCommit,
  asOperatorConSessione,
  asOwner,
  connect,
  pgCode,
  resetData,
} from '../helpers/db'
import { dimenticaSessioni, sessioneDi } from '../helpers/sessioni'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

// REGOLA DI QUESTO FILE: ogni prova che scrive e poi rilegge da un'altra
// connessione, o che incatena due invii, usa `asOperatorCommit`. `asOperator`
// chiude sempre con un rollback, e userebbe un database che torna vuoto.

const V1 = '50000000-0000-4000-8000-0000000000b1'
const A1 = '60000000-0000-4000-8000-0000000000b1'
const A2 = '60000000-0000-4000-8000-0000000000b2'
const A3 = '60000000-0000-4000-8000-0000000000b3'
const NUOVA_CLIENTE = '40000000-0000-4000-8000-0000000000b9'
let seq = 0
const codice = () => `70000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

type Risposta = {
  esito: string
  visita?: string
  appuntamenti?: { id: string; versione: string }[]
  stato?: {
    visita: string
    data: string
    cliente: string
    appuntamenti: {
      id: string
      versione: string
      operatrice: string
      servizio: string
      inizio: number
      durata: number
    }[]
  }
}

const app1 = (id: string, inizio: number, operatrice = VERA, servizio = SERVICE_REFILL, durata = 12) => ({
  id,
  operatrice,
  servizio,
  inizio,
  durata,
})

function salva(
  c: import('pg').Client,
  opts: {
    codice?: string
    visita?: string
    cliente?: string
    clienteNuova?: unknown
    data?: string
    appuntamenti: unknown[]
    visitaAttesa?: string | null
    attesi?: unknown[] | null
  },
) {
  return c
    .query<{ r: Risposta }>('select salva_visita($1, $2, $3, $4, $5::date, $6, $7, $8) as r', [
      opts.codice ?? codice(),
      opts.visita ?? V1,
      opts.cliente ?? CLIENT_MARIA,
      opts.clienteNuova ? JSON.stringify(opts.clienteNuova) : null,
      opts.data ?? DAY_ONE,
      JSON.stringify(opts.appuntamenti),
      opts.visitaAttesa ?? null,
      opts.attesi ? JSON.stringify(opts.attesi) : null,
    ])
    .then((r) => r.rows[0].r)
}

const statoDb = () =>
  asOwner(async (c) => {
    const v = await c.query<{ id: string; d: string; cl: string }>(
      'select id, visit_date::text as d, client_id as cl from visit order by id',
    )
    const a = await c.query<{ id: string; v: string; s: number; n: number; op: string }>(
      'select id, visit_id as v, start_cell as s, cell_count as n, operator_id as op from appointment order by id',
    )
    return { visite: v.rows, appuntamenti: a.rows }
  })

/**
 * Aspetta che la connessione data sia ferma su un blocco. Si aspetta la
 * CONDIZIONE e non un tempo: un `setTimeout` fisso rende rosse le prove di
 * concorrenza quando la macchina è lenta, senza che ci sia un difetto sotto.
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

describe('creazione', () => {
  it('crea visita e appuntamenti insieme e restituisce le versioni', async () => {
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)] }),
    )
    expect(r.esito).toBe('salvata')
    expect(r.appuntamenti?.map((x) => x.id).sort()).toEqual([A1, A2].sort())
    expect(r.visita).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    const stato = await statoDb()
    expect(stato.visite).toHaveLength(1)
    expect(stato.appuntamenti.map((x) => x.s).sort((p, q) => p - q)).toEqual([120, 140])
  })

  it('non lascia niente dietro se il secondo appuntamento collide', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const codiceErrore = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await salva(c, {
          visita: '50000000-0000-4000-8000-0000000000b2',
          cliente: CLIENT_LUCIA,
          appuntamenti: [app1(A2, 200), app1(A3, 120)],
        })
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('23505')
    // ⚠︎ Le due righe qui sotto NON sono il presidio di questa prova, e la
    // revisione del 25/09/2026 lo ha misurato: tolte, la suite resta verde, e
    // con `set constraints … immediate` tolto questa prova arrossisce lo stesso
    // — perché il `23505` che slitta al commit fa fallire `asOperatorCommit`,
    // non l'asserzione. Misurano l'atomicità della TRANSAZIONE, che è una
    // proprietà di PostgreSQL, non del codice consegnato. Restano perché
    // documentano l'esito atteso; il presidio vero è il codice d'errore sopra,
    // che la sonda 8b uccide, e la prova sul codice d'invio riusabile qui
    // sotto, che è l'unica cosa dello scenario che il codice decide davvero.
    const stato = await statoDb()
    expect(stato.visite).toHaveLength(1)
    expect(stato.appuntamenti).toHaveLength(1)
  })

  // ⚠︎ La prova VIVA che le due righe annotate sopra non erano. Design 3a §4.4:
  // «se l'invio fallisce e annulla la transazione, il codice resta libero e
  // “Controlla” lo brucia». Questo dipende da una scelta del codice — che
  // `app.apri_invio` giri DENTRO la transazione di chi chiama — e non da
  // PostgreSQL: una registrazione fatta in una transazione autonoma (dblink,
  // o un `pragma` in un altro motore) sopravvivrebbe all'annullamento, il
  // codice resterebbe `in_corso` per sempre e l'operatrice non potrebbe più
  // né salvare né far dire a «Controlla» che cos'è successo.
  it('un invio fallito lascia il codice libero, e lo stesso codice salva al secondo tentativo', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const cod = codice()
    const codiceErrore = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await salva(c, {
          codice: cod,
          visita: '50000000-0000-4000-8000-0000000000b2',
          cliente: CLIENT_LUCIA,
          appuntamenti: [app1(A2, 200), app1(A3, 120)],
        })
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('23505')
    // Il registro non conserva il codice bruciato a metà.
    const registro = await asOwner(async (c) => {
      const x = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [cod])
      return x.rows.map((y) => y.e)
    })
    expect(registro).toEqual([])
    // Gemella positiva, ed è il punto: lo STESSO codice funziona ancora.
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        codice: cod,
        visita: '50000000-0000-4000-8000-0000000000b2',
        cliente: CLIENT_LUCIA,
        appuntamenti: [app1(A2, 200)],
      }),
    )
    expect(r.esito).toBe('salvata')
  })

  it('crea la cliente nuova nella stessa transazione', async () => {
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        cliente: NUOVA_CLIENTE,
        clienteNuova: { nome: 'Giulia Bianchi', telefono: '+393339998877', mese: 3, giorno: 12 },
        appuntamenti: [app1(A1, 120)],
      }),
    )
    expect(r.esito).toBe('salvata')
    const nomi = await asOwner(async (c) => {
      const x = await c.query<{ n: string }>('select full_name as n from client where id = $1', [NUOVA_CLIENTE])
      return x.rows.map((y) => y.n)
    })
    expect(nomi).toEqual(['Giulia Bianchi'])
  })

  it('non lascia la cliente nuova se la visita non si salva', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await salva(c, {
          visita: '50000000-0000-4000-8000-0000000000b3',
          cliente: NUOVA_CLIENTE,
          clienteNuova: { nome: 'Giulia Bianchi', telefono: '+393339998877', mese: 3, giorno: 12 },
          appuntamenti: [app1(A3, 120)],
        })
      } catch {
        /* il conflitto è il punto della prova */
      }
    })
    const quante = await asOwner(async (c) => {
      const x = await c.query<{ n: string }>('select count(*) as n from client where id = $1', [NUOVA_CLIENTE])
      return Number(x.rows[0].n)
    })
    // ⚠︎ Stessa natura delle due righe annotate sopra: misurato il 25/09/2026,
    // tolta questa asserzione la suite resta verde, e la sonda 8b fa arrossire
    // questa prova comunque. L'atomicità è della transazione. Quello che il
    // codice decide davvero — che la cliente nuova si scriva DOPO il codice
    // d'invio — è presidiato dalla prova «non lascia la cliente nuova quando
    // l invio è già bruciato», che gira su un invio già annullato e quindi
    // COMMETTE.
    expect(quante).toBe(0)
  })

  it('risponde esiste_gia su un id che c è già, senza scrivere', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const r = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A2, 200)] }))
    expect(r.esito).toBe('esiste_gia')
    const stato = await statoDb()
    expect(stato.appuntamenti.map((x) => x.s)).toEqual([120])
  })

  it('risponde cancellata_altrove su un id che risulta cancellato', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    const r = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A2, 200)] }))
    expect(r.esito).toBe('cancellata_altrove')
  })

  it('rifiuta un elenco vuoto', async () => {
    const codiceErrore = await asOperator(VERA_AUTH, async (c) => {
      try {
        await salva(c, { appuntamenti: [] })
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('22023')
  })
})

describe('modifica', () => {
  const crea = () =>
    asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)] }),
    )

  it('sposta un solo servizio e cambia la versione del solo appuntamento toccato', async () => {
    const creata = await crea()
    const versioni = Object.fromEntries(creata.appuntamenti!.map((a) => [a.id, a.versione]))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    const nuove = Object.fromEntries(r.appuntamenti!.map((a) => [a.id, a.versione]))
    expect(nuove[A1]).not.toBe(versioni[A1])
    expect(nuove[A2]).toBe(versioni[A2])
  })

  it('rifiuta una versione vecchia di un appuntamento', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('update appointment set start_cell = 160 where id = $1', [A2]))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('modificata_altrove')
    expect(r.stato?.appuntamenti.map((x) => x.inizio).sort((p, q) => p - q)).toEqual([120, 160])
  })

  it('NON toglie in silenzio un appuntamento che una collega ha aggiunto', async () => {
    const creata = await crea()
    await asOwner((c) =>
      c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5::date, 200, 12)`,
        [A3, V1, ANNALISA, SERVICE_REFILL, DAY_ONE],
      ),
    )
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('modificata_altrove')
    const stato = await statoDb()
    expect(stato.appuntamenti.map((x) => x.id).sort()).toEqual([A1, A2, A3].sort())
  })

  it('cambia la versione della visita quando cambia l insieme, anche se la visita in sé non cambia', async () => {
    const creata = await crea()
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 120)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    expect(r.visita).not.toBe(creata.visita)
  })

  it('toglie l unico servizio e ne aggiunge un altro senza cancellare la visita', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A3, 120, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    const stato = await statoDb()
    expect(stato.visite).toHaveLength(1)
    expect(stato.appuntamenti.map((x) => x.id)).toEqual([A3])
  })

  it('cambia la data e porta con sé gli appuntamenti', async () => {
    const creata = await crea()
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        data: DAY_TWO,
        appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    const stato = await statoDb()
    expect(stato.visite[0].d).toBe(DAY_TWO)
    expect(new Set(stato.appuntamenti.map((x) => x.v))).toEqual(new Set([V1]))
  })

  it('risponde cancellata_altrove se la visita è stata cancellata', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A1, 120)], visitaAttesa: creata.visita, attesi: creata.appuntamenti }),
    )
    expect(r.esito).toBe('cancellata_altrove')
  })

  it('risponde non_trovata su una visita mai esistita', async () => {
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        visita: '50000000-0000-4000-8000-0000000000ff',
        appuntamenti: [app1(A1, 120)],
        visitaAttesa: '2026-03-12T08:00:00.000000Z',
        attesi: [],
      }),
    )
    expect(r.esito).toBe('non_trovata')
  })

  it('rifiuta un appuntamento che appartiene a un altra visita', async () => {
    const creata = await crea()
    await asOwner(async (c) => {
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [
        '50000000-0000-4000-8000-0000000000c1',
        CLIENT_LUCIA,
        DAY_ONE,
      ])
      await c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5::date, 220, 12)`,
        [A3, '50000000-0000-4000-8000-0000000000c1', ANNALISA, SERVICE_REFILL, DAY_ONE],
      )
    })
    const codiceErrore = await asOperator(VERA_AUTH, async (c) => {
      try {
        await salva(c, {
          appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10), app1(A3, 240)],
          visitaAttesa: creata.visita,
          attesi: creata.appuntamenti,
        })
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('22023')
  })

  // ⚠︎ Sonda 3 del Passo 5. Il piano prevede che la sonda «togli il confronto
  // sulla versione della visita» possa restare senza vittime, e ordina di
  // aggiungere «una prova che cambia solo la data da un'altra sessione».
  // MISURATO che quella forma non basta: `visit_date` cascata su
  // `appointment.appointment_date` (0004:26-29) e il trigger
  // `appointment_touch` alza anche le versioni degli appuntamenti, quindi
  // l'insieme differisce comunque e il confronto sull'insieme copre il caso.
  // L'unico campo della visita che cambia la sua versione SENZA toccare quelle
  // degli appuntamenti è `client_id` — ed è un gesto reale: una collega
  // corregge la cliente sbagliata mentre la scheda è aperta.
  it('rifiuta una versione vecchia della visita quando l insieme degli appuntamenti è intatto', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('update visit set client_id = $2 where id = $1', [V1, CLIENT_LUCIA]))
    // Precondizione asserita: l'insieme è DAVVERO intatto. Senza, la prova
    // resterebbe verde presidiando il confronto sull'insieme invece di quello
    // sulla versione della visita, che è ciò che deve misurare.
    const versioniOra = await asOwner(async (c) => {
      const x = await c.query<{ id: string; v: string }>(
        'select id, app.versione(updated_at) as v from appointment where visit_id = $1 order by id',
        [V1],
      )
      return x.rows
    })
    expect(versioniOra.map((x) => ({ id: x.id, versione: x.v }))).toEqual(
      [...creata.appuntamenti!].sort((p, q) => p.id.localeCompare(q.id)),
    )
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('modificata_altrove')
    expect(r.stato?.cliente).toBe(CLIENT_LUCIA)
    // Gemella positiva: con la versione GIUSTA lo stesso salvataggio passa.
    const stato = await asOperator(VERA_AUTH, async (c) => {
      const x = await c.query<{ s: { visita: string } }>('select stato_visita($1) as s', [V1])
      return x.rows[0].s
    })
    const ok = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        cliente: CLIENT_LUCIA,
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: stato.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(ok.esito).toBe('salvata')
  })

  // ⚠︎ IL GIRO INTERO, dalla revisione del 25/09/2026. È la prova che mancava, e
  // le due revisioni avversariali l'hanno trovata da due lati diversi.
  //
  // Design 3a §4.4: dopo `modificata_altrove` la scheda «prende lo stato
  // corrente e le sue versioni, che diventano quelle di partenza». Nessuna
  // prova faceva quel giro: tutte ripartivano da `creata.appuntamenti`, cioè
  // dal valore che `salva_visita` aveva restituito, mai da `stato`.
  //
  // Conseguenza misurata sulla consegna: dentro `stato_visita` si potevano
  // mettere a costante le VERSIONI degli appuntamenti (0 rosse su 347), e a
  // null `operatrice` e `servizio` (0 rosse su 347). Sono i tre campi che non
  // servono a MOSTRARE la visita ma a RISCRIVERLA, ed erano gli unici tre
  // senza un lettore. Questa prova li legge tutti e tre.
  //
  // ⚠︎ Al Task 6 i consumatori di `stato_visita` passano da uno a tre
  // (`sposta_visita_a` e `cancella_visita` restituiscono lo stesso `stato`):
  // senza questa prova il presidio nascerebbe morto in tre punti invece che
  // in uno.
  it('il giro si chiude: dopo modificata_altrove la scheda riparte dallo stato e salva', async () => {
    const creata = await crea()
    // Una collega sposta un servizio. La scheda di Vera è ancora sulle versioni
    // vecchie e il suo primo salvataggio deve rimbalzare.
    await asOwner((c) => c.query('update appointment set start_cell = 160 where id = $1', [A2]))
    const primo = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(primo.esito).toBe('modificata_altrove')

    // La scheda si ridisegna da `stato`: è QUI che i tre campi muti vengono
    // letti. `operatrice`, `servizio` e `durata` ricostruiscono i blocchi;
    // `versione` e `stato.visita` diventano l'atteso del secondo invio.
    const dallaScheda = primo.stato!.appuntamenti.map((a) => ({
      id: a.id,
      operatrice: a.operatrice,
      servizio: a.servizio,
      inizio: a.inizio,
      durata: a.durata,
    }))
    expect(dallaScheda).toHaveLength(2)
    // Gemella positiva delle asserzioni sul contenuto: senza, uno `stato` con
    // i campi a null passerebbe ogni riga che segue.
    expect(dallaScheda.find((x) => x.id === A2)).toEqual({
      id: A2,
      operatrice: ALESSANDRA,
      servizio: SERVICE_MASSAGE,
      inizio: 160,
      durata: 10,
    })

    // ⚠︎ La PROIEZIONE su {id, versione} e l'ordine di `id` non sono un
    // dettaglio di questa prova: sono il contratto di `p_attesi`. Vedi la prova
    // qui sotto, che li pianta.
    const attesi = primo
      .stato!.appuntamenti.map((a) => ({ id: a.id, versione: a.versione }))
      .sort((p, q) => p.id.localeCompare(q.id))

    // Vera rifà la sua modifica sopra il lavoro della collega e stavolta passa.
    const secondo = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [{ ...dallaScheda.find((x) => x.id === A1)!, inizio: 126 }, dallaScheda.find((x) => x.id === A2)!],
        visitaAttesa: primo.stato!.visita,
        attesi,
      }),
    )
    expect(secondo.esito).toBe('salvata')
    const stato = await statoDb()
    expect(stato.appuntamenti.map((x) => x.s).sort((p, q) => p - q)).toEqual([126, 160])
    // L'appuntamento della collega è ancora suo: il giro non gliel'ha tolto.
    expect(stato.appuntamenti.find((x) => x.id === A2)!.op).toBe(ALESSANDRA)
  })

  // ⚠︎ L'ALTRA META del contratto: l'ordine lo deve tenere anche il DATABASE.
  //
  // `v_correnti` è costruito con `order by a.id` e confrontato con `p_attesi`,
  // che il chiamante ordina per `id`. La revisione empirica ha misurato che
  // togliere quell'`order by` dava 0 rosse su 347 e non è riuscita a costruire
  // il danno, perché gli UPDATE sono HOT e l'indice conserva l'ordine.
  //
  // L'asse giusto non è l'aggiornamento: è l'INSERIMENTO. Gli id vengono da
  // `crypto.randomUUID()` sul telefono (spec §4.4), quindi l'ordine in cui la
  // scheda crea i blocchi non ha nessuna relazione con l'ordine dei loro id.
  // Creando gli appuntamenti in ordine di id DECRESCENTE, l'ordine fisico
  // delle righe è l'inverso di quello degli id, e senza `order by` un secondo
  // salvataggio perfettamente conforme al contratto riceve `modificata_altrove`
  // — misurato il 25/09/2026: verde sul consegnato, rossa con l'`order by`
  // tolto. La riga è copiata parola per parola in `sposta_visita_a` e
  // `cancella_visita` al Task 6.
  it('tiene l ordine anche quando gli appuntamenti sono creati in ordine di id decrescente', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10), app1(A1, 120)] }),
    )
    expect(creata.esito).toBe('salvata')
    // Precondizione asserita: la funzione restituisce comunque in ordine di id,
    // altrimenti questa prova misurerebbe l'ordine di `salvata.appuntamenti`
    // invece di quello di `v_correnti`.
    expect(creata.appuntamenti!.map((a) => a.id)).toEqual([A1, A2])
    const attesi = [...creata.appuntamenti!].sort((p, q) => p.id.localeCompare(q.id))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi,
      }),
    )
    expect(r.esito).toBe('salvata')
    expect((await statoDb()).appuntamenti.map((x) => x.s).sort((p, q) => p - q)).toEqual([126, 140])
  })

  // ⚠︎ Pianta il CONTRATTO di `p_attesi`, che era implicito e che la revisione
  // del 25/09/2026 ha misurato: il confronto della regola 6 è POSIZIONALE
  // (`is distinct from` fra due array jsonb), non insiemistico. Quindi chi
  // chiama deve proiettare `stato.appuntamenti` su {id, versione} — che ha SEI
  // chiavi, non due — e ordinarlo per `id`.
  //
  // La spec §4.1 regola 6 parla di «insieme»: la decisione del 25/09/2026 è di
  // tenere il confronto posizionale e SCRIVERE il contratto (spec §4.1,
  // revisione 15), perché l'ordine di `id` è già quello che `salva_visita`
  // restituisce in `appuntamenti`. Questa prova è ciò che rende la decisione
  // reversibile in modo rumoroso: chi rendesse il confronto insiemistico la
  // farebbe arrossire, e sarebbe costretto a togliere il contratto dalla spec
  // invece di lasciare i due documenti a contraddirsi.
  it('l insieme atteso si confronta in ordine di id, e non nella forma di stato_visita', async () => {
    const creata = await crea()
    const invertito = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: [...creata.appuntamenti!].reverse(),
      }),
    )
    expect(invertito.esito).toBe('modificata_altrove')

    const stato = await asOperator(VERA_AUTH, async (c) => {
      const x = await c.query<{ s: NonNullable<Risposta['stato']> }>('select stato_visita($1) as s', [V1])
      return x.rows[0].s
    })
    const grezzo = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: stato.visita,
        attesi: stato.appuntamenti,
      }),
    )
    expect(grezzo.esito).toBe('modificata_altrove')

    // Gemella positiva: proiettato e ordinato, lo STESSO salvataggio passa.
    // Senza di lei le due righe sopra resterebbero verdi anche se
    // `modificata_altrove` arrivasse per una ragione qualunque.
    const proiettato = stato.appuntamenti
      .map((a) => ({ id: a.id, versione: a.versione }))
      .sort((p, q) => p.id.localeCompare(q.id))
    const ok = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: stato.visita,
        attesi: proiettato,
      }),
    )
    expect(ok.esito).toBe('salvata')
  })
})

describe('registro degli invii', () => {
  it('restituisce annullato a un invio che «Controlla» ha già bruciato', async () => {
    const cod = codice()
    await asOwner((c) => c.query("insert into invio (codice, esito) values ($1, 'annullato')", [cod]))
    const r = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { codice: cod, appuntamenti: [app1(A1, 120)] }))
    expect(r.esito).toBe('annullato')
    expect((await statoDb()).visite).toEqual([])
  })

  it('registra l esito accanto al codice', async () => {
    const cod = codice()
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { codice: cod, appuntamenti: [app1(A1, 120)] }))
    const esito = await asOwner(async (c) => {
      const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [cod])
      return r.rows[0].e
    })
    expect(esito).toBe('salvata')
  })

  it('a un account chiuso PRIMA della chiamata non dice mai salvata', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    // La sessione di Vera sparisce: da qui in poi la sicurezza per riga le
    // nasconde tutto, e un UPDATE tocca zero righe SENZA errore.
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner((c) => c.query('delete from auth.sessions where id = $1', [sessione.sessionId]))
    const esito = await asOperatorConSessione(VERA_AUTH, sessione.sessionId, async (c) => {
      try {
        const r = await salva(c, {
          appuntamenti: [app1(A1, 126)],
          visitaAttesa: creata.visita,
          attesi: creata.appuntamenti,
        })
        return r.esito
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(esito).not.toBe('salvata')
    const stato = await statoDb()
    expect(stato.appuntamenti.map((x) => x.s)).toEqual([120])
    dimenticaSessioni()
  })

  // ⚠︎ Vedi l'avvertimento in testa a questo task: la sessione è catturata
  // PRIMA della disattivazione, quindi da 0015 la causa vera è la sessione
  // cancellata, non `is_active`. Questa prova presidia le regole 5 e 6, NON
  // `is_active`.
  //
  // DECISIONE del Task 5, presa per misura e non lasciata implicita. Il piano
  // dava due strade: riaprire una sessione viva dopo la disattivazione, e
  // tornare a presidiare `is_active`; oppure dichiararlo nel commento. Si è
  // presa la seconda, perché la prima non è praticabile in questa FORMA: lo
  // scrittore fissa i propri claim con `set_config(..., true)` PRIMA di
  // mettersi in coda, e la disattivazione cancella TUTTE le sessioni
  // dell'account (0015) — compresa quella che i suoi claim nominano. Una
  // sessione aperta dopo non entrerebbe in una transazione già in attesa.
  //
  // Misurato il 25/09/2026 su suite intera: togliendo `and o.is_active` da
  // `app.is_active_operator()` le rosse sono DUE — `access-control > shows
  // nothing to a deactivated operator` e `account-directory > returns nothing
  // to a deactivated operator` — e NESSUNA prova di questo file è fra loro.
  // Il presidio di `is_active` sta intero lì, e questa prova non lo tocca.
  //
  // ⚠︎ E non si irrobustiscono quelle due con la precondizione asserita: al
  // Task 4 quel gesto ha fatto scendere le loro rosse da 2 a 1.
  it('l operatrice disattivata mentre il salvataggio è in coda riceve non_trovata, mai salvata', async () => {
    // Misurato tre volte al quarto giro e tre al quinto: l'esito è
    // `non_trovata`, non un errore. Quando il blocco si libera, la fotografia
    // nuova è già senza permessi, quindi la regola 2 legge un insieme vuoto e
    // la regola 6 se ne accorge. È il presidio delle regole 5 e 6 sotto
    // concorrenza — con `p_attesi` CORRETTI, come qui. Con `p_attesi` vuoti la
    // stessa forma arriva invece alla regola 11: la prova qui sotto.
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const guardiano = await connect()
    const scrittore = await connect()
    const sessione = await sessioneDi(VERA_AUTH)
    let esito = 'nessun errore'
    try {
      // 1. il guardiano prende il blocco sulla visita e lo tiene
      await guardiano.query('begin')
      await guardiano.query('select 1 from visit where id = $1 for update', [V1])

      // 2. il salvataggio di Vera parte e si mette in coda
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      const inCoda = scrittore
        .query('select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r', [
          codice(),
          V1,
          CLIENT_MARIA,
          DAY_ONE,
          JSON.stringify([app1(A1, 126)]),
          creata.visita,
          JSON.stringify(creata.appuntamenti),
        ])
        .then((r) => (r.rows[0] as { r: { esito: string } }).r.esito)
        .catch((e) => pgCode(e) ?? 'ignoto')

      // 3. mentre è in coda, una collega disattiva Vera. Si aspetta la
      //    CONDIZIONE, non un tempo: con `setTimeout(300)` lo scrittore può non
      //    essere ancora arrivato al blocco, la disattivazione lo precede e
      //    l'esito diventa `42501` dalla guardia in testa — prova rossa senza
      //    nessun difetto sotto.
      await attendiBlocco(scrittore)
      await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))

      // 4. il guardiano molla: il salvataggio riparte SENZA più i permessi
      await guardiano.query('commit')
      esito = await inCoda
      await scrittore.query('rollback').catch(() => {})
    } finally {
      await guardiano.end()
      await scrittore.end()
      await asOwner((c) => c.query('update operator set is_active = true where id = $1', [VERA]))
      dimenticaSessioni()
    }
    // `non_trovata` e non un errore: il valore misurato, non «qualcosa che non
    // sia salvata». Una prova che accettasse qualunque cosa diversa da
    // `salvata` resterebbe verde anche se le regole 5 e 6 sparissero.
    expect(esito).toBe('non_trovata')
    expect((await statoDb()).appuntamenti.map((x) => x.s)).toEqual([120])
  })

  // ⚠︎ Vedi l'avvertimento in testa a questo task: stessa forma, stessa
  // conseguenza. Presidia la regola 11, NON `is_active` — vale parola per
  // parola la decisione scritta sopra la prova precedente, misura compresa.
  it('la regola 11 ferma la scrittura quando la visibilità cade DOPO i confronti', async () => {
    // Misurato 3 volte su 3 al quinto giro. Il blocco NON è sulla visita ma
    // sulla riga della cliente: così `salva_visita` supera la regola 2 e la
    // regola 6 con argomenti tutti corretti, e si ferma sull'`insert into
    // public.client` della cliente nuova. Quando riparte, l'UPDATE della visita
    // apre la fotografia nuova, è cieco, tocca zero righe: regola 11.
    //
    // Si asserisce il MESSAGGIO, non il codice: togliendo il riesame arriva
    // comunque un 42501, ma dal `with check` della politica su `appointment`.
    // Una prova sul solo codice resterebbe verde e non presidierebbe niente.
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const guardiano = await connect()
    const scrittore = await connect()
    const sessione = await sessioneDi(VERA_AUTH)
    let messaggio = 'nessun errore'
    try {
      // 1. il guardiano tiene la riga della cliente e non committa
      await guardiano.query('begin')
      await guardiano.query('update client set full_name = full_name where id = $1', [CLIENT_MARIA])

      // 2. il salvataggio parte con la stessa cliente passata anche come
      //    cliente nuova (percorso previsto dalla firma: stesso id), e si
      //    blocca sull'inserimento, che aspetta l'esito del guardiano
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      const inCoda = salva(scrittore, {
        cliente: CLIENT_MARIA,
        clienteNuova: { nome: 'Maria Rossi', telefono: '+393331110000', mese: 3, giorno: 12 },
        appuntamenti: [app1(A1, 126)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      })
        .then(() => 'nessun errore')
        .catch((e: { message: string }) => e.message)

      // 3. mentre è ferma sulla cliente, una collega disattiva Vera
      await attendiBlocco(scrittore)
      await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))

      // 4. il guardiano molla: il salvataggio riparte senza più i permessi
      await guardiano.query('commit')
      messaggio = await inCoda
      await scrittore.query('rollback').catch(() => {})
    } finally {
      await guardiano.end()
      await scrittore.end()
      await asOwner((c) => c.query('update operator set is_active = true where id = $1', [VERA]))
      dimenticaSessioni()
    }
    expect(messaggio).toContain('la visita non è più visibile a chi scrive')
    expect((await statoDb()).appuntamenti.map((x) => x.s)).toEqual([120])
  })

  // ⚠︎ Sonda 1 del Passo 5: il piano la dichiara SENZA vittima e ordina di
  // aggiungerla. Il codice d'invio si registra PRIMA di qualunque scrittura
  // (regola 0, spec §4.4): spostando `app.apri_invio` dopo l'inserimento della
  // cliente nuova, un invio già bruciato da «Controlla» restituirebbe
  // `annullato` — e la prova che c'è già resterebbe verde — ma la cliente
  // sarebbe già stata scritta e la transazione la committerebbe. Una persona
  // in rubrica che non ha mai preso appuntamento, nata da un invio che il
  // database dichiara non arrivato.
  it('non lascia la cliente nuova quando l invio è già bruciato', async () => {
    const cod = codice()
    await asOwner((c) => c.query("insert into invio (codice, esito) values ($1, 'annullato')", [cod]))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        codice: cod,
        cliente: NUOVA_CLIENTE,
        clienteNuova: { nome: 'Giulia Bianchi', telefono: '+393339998877', mese: 3, giorno: 12 },
        appuntamenti: [app1(A1, 120)],
      }),
    )
    expect(r.esito).toBe('annullato')
    const quante = await asOwner(async (c) => {
      const x = await c.query<{ n: string }>('select count(*) as n from client where id = $1', [NUOVA_CLIENTE])
      return Number(x.rows[0].n)
    })
    expect(quante).toBe(0)
    // Gemella positiva dell'asserzione sul vuoto: senza, un `NUOVA_CLIENTE`
    // sbagliato — o un `insert into public.client` che non arriva mai per
    // qualunque altra ragione — renderebbe questa prova verde per sempre.
    expect((await statoDb()).visite).toEqual([])
  })
})

// ⚠︎ Questo blocco NON è nel piano: lo impone la consegna del Task 5, perché il
// reperto 3 dell'appendice del Task 4 dice che non esiste nessun audit
// permanente su `pg_proc.proacl` — `catalogue-audit.test.ts` enumera
// `pg_class.relacl` e basta — e questo task crea DUE funzioni. Finché il Task 9
// non stringe l'audit, ogni funzione è presidiata solo da asserzioni scritte a
// mano, come in `write-functions`, `account-directory` e `availability-window`.
//
// ⚠︎ E la riga che porta è il `revoke … from public, anon`, NON il `grant …
// to authenticated`: misurato al Task 4, in `public` c'è un `alter default
// privileges` di Supabase — da due concedenti, `postgres` e `supabase_admin` —
// che concede EXECUTE ad `anon`, `authenticated` e `service_role` su ogni
// funzione nuova. Togliere il `grant` è EQUIVALENTE, non muto.
describe('permessi delle due funzioni nuove', () => {
  const FIRMA_SALVA = 'public.salva_visita(uuid, uuid, uuid, jsonb, date, jsonb, text, jsonb)'
  const FIRMA_STATO = 'public.stato_visita(uuid)'

  // ⚠ discriminante: su `salva_visita` la chiamata da anon NON distingue
  // «EXECUTE revocato» da «EXECUTE concesso e la guardia in testa risponde»:
  // `app.is_active_operator()` solleva 42501 in tutti e due i casi. Su
  // `stato_visita`, che è invoker e senza guardia, la chiamata distingue —
  // con EXECUTE concesso tornerebbe NULL, non un errore. `has_function_privilege`
  // distingue per tutte e due, e vede anche una concessione a PUBLIC.
  it('nega EXECUTE ad anon e a public su tutte e due, e lo concede ad authenticated', async () => {
    const privilegi = await asOwner(async (c) => {
      const r = await c.query<{ f: string; ruolo: string; puo: boolean }>(
        `select f, ruolo, has_function_privilege(ruolo, f, 'EXECUTE') as puo
           from unnest(array[$1::text, $2::text]) as f,
                unnest(array['anon', 'public', 'authenticated']) as ruolo
          order by f, ruolo`,
        [FIRMA_SALVA, FIRMA_STATO],
      )
      return r.rows
    })
    // Sei righe, non «nessuna riga»: un elenco vuoto passerebbe qualunque
    // asserzione sul contenuto. Un nome di ruolo inesistente solleva 42704 e
    // una firma sbagliata 42883, quindi la riga non è inerte.
    expect(privilegi).toHaveLength(6)
    expect(privilegi.filter((x) => !x.puo).map((x) => `${x.f}/${x.ruolo}`).sort()).toEqual(
      [
        `${FIRMA_SALVA}/anon`,
        `${FIRMA_SALVA}/public`,
        `${FIRMA_STATO}/anon`,
        `${FIRMA_STATO}/public`,
      ].sort(),
    )
    expect(privilegi.filter((x) => x.puo).map((x) => x.f).sort()).toEqual([FIRMA_SALVA, FIRMA_STATO].sort())
  })

  // Due `asAnon` separate e non due query nella stessa: la prima che fallisce
  // aborta la transazione, e la seconda tornerebbe `25P02` — cioè una prova
  // che non guarda più la funzione che dice di guardare (misurato).
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
    const salva = await prova('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
      codice(),
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([app1(A1, 120)]),
    ])
    const stato = await prova('select stato_visita($1)', [V1])
    expect(salva).toBe('42501')
    expect(stato).toBe('42501')
  })

  // La gemella POSITIVA delle due prove qui sopra. `stato_visita` è esercitata
  // per via indiretta dalle prove di `modificata_altrove`, ma NESSUNA la chiama
  // direttamente: senza questa riga, revocarle EXECUTE anche ad `authenticated`
  // lascerebbe la suite verde, perché dentro `salva_visita` gira con i diritti
  // del chiamante ma la chiamata non passa dal controllo dei permessi che un
  // `select stato_visita(...)` da PostgREST attraverserebbe.
  it('ma un operatrice attiva le esegue davvero tutte e due', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)] }),
    )
    expect(creata.esito).toBe('salvata')
    const stato = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ s: Risposta['stato'] & { visita: string } }>('select stato_visita($1) as s', [V1])
      return r.rows[0].s
    })
    expect(stato.data).toBe(DAY_ONE)
    expect(stato.cliente).toBe(CLIENT_MARIA)
    expect(stato.visita).toBe(creata.visita)
    expect(stato.appuntamenti.map((x) => x.inizio).sort((p, q) => p - q)).toEqual([120, 140])
  })

  // Il presidio di catalogo di `catalogue-audit.test.ts` filtra su `prosecdef`
  // e quindi NON guarda queste due, che sono invoker: senza questa riga,
  // togliere `set search_path = ''` non renderebbe rossa nessuna prova.
  it('sono security invoker, con search_path vuoto, e stato_visita è stable', async () => {
    const righe = await asOwner(async (c) => {
      const r = await c.query<{ nome: string; sicurezza: boolean; volatilita: string; config: string[] | null }>(
        `select p.proname as nome, p.prosecdef as sicurezza, p.provolatile as volatilita, p.proconfig as config
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname in ('salva_visita', 'stato_visita')
          order by p.proname`,
      )
      return r.rows
    })
    expect(righe.map((x) => x.nome)).toEqual(['salva_visita', 'stato_visita'])
    expect(righe.filter((x) => x.sicurezza)).toEqual([])
    expect(righe.map((x) => x.config)).toEqual([['search_path=""'], ['search_path=""']])
    expect(righe.find((x) => x.nome === 'stato_visita')!.volatilita).toBe('s')
    expect(righe.find((x) => x.nome === 'salva_visita')!.volatilita).toBe('v')
  })
})
