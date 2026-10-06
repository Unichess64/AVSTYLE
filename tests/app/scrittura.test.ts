// tests/app/scrittura.test.ts
//
// Le Server Actions di scrittura contro Supabase locale, con la sessione vera
// di Vera (piano 3a-2, Task 8). Si prova il CORPO, che prende il client come
// argomento: il guscio `'use server'` gli passa quello di `clientServer()`,
// che sotto Vitest non gira (importa `next/headers`).
//
// Gli otto passi di §4.3, e i contratti C3 e C5 al contatto col database:
//   — C3: dopo un `modificata_altrove` la scheda che adotta lo stato salva al
//     secondo colpo, e il server RIPROIETTA gli attesi a ogni chiamata;
//   — passo 2: ciò che non passa la validazione non arriva alla funzione, e lo
//     si misura sulla riga di `invio`, che la funzione scrive come PRIMA cosa;
//   — passo 3: avvisi e conflitti fermano prima di scrivere;
//   — passo 6: il 23505 si legge per NOME del vincolo;
//   — passo 7: l'account si ricontrolla prima di scegliere il messaggio.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adottaStato, apriSchedaSuVisita, serializza, type SchedaSerializzata, type ServizioInScheda } from '../../src/dominio/scheda'
import type { StatoVisita } from '../../src/dominio/stato-visita'
import { leggiStato } from '../../src/server/lettura-scheda'
import { eliminaVisita, salvaVisita, togliServizio } from '../../src/server/scrittura-visita'
import { ALESSANDRA, ANNALISA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOwner, connect, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const conToken = (token: string): SupabaseClient =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
const vera = async () => conToken((await sessioneDi(VERA_AUTH)).accessToken)

const V1 = '50000000-0000-4000-8000-0000000008a1'
const V2 = '50000000-0000-4000-8000-0000000008a2'
const A1 = '60000000-0000-4000-8000-0000000008a1'
const A2 = '60000000-0000-4000-8000-0000000008a2'
const A3 = '60000000-0000-4000-8000-0000000008a3'
const B1 = '60000000-0000-4000-8000-0000000008b1'
const B2 = '60000000-0000-4000-8000-0000000008b2'
const NUOVA = '40000000-0000-4000-8000-0000000008c1'
const codice = () => crypto.randomUUID()

const servizio = (id: string, operatriceId: string, servizioId: string, inizio: number, durata: number, nuovo = true): ServizioInScheda => ({
  id, nuovo, operatriceId, servizioId, inizio, durata, durataAMano: false, segueIlPrecedente: false,
})

/** Maria: Refill con Vera alle 10:00 e Massaggio con Alessandra alle 11:30. Due operatrici, due servizi. */
function nuovaScheda(altro: Partial<SchedaSerializzata> = {}): SchedaSerializzata {
  return {
    visitaId: V1,
    modo: 'creazione',
    cliente: { tipo: 'esistente', id: CLIENT_MARIA },
    clienteEsisteAncora: true,
    data: DAY_ONE,
    servizi: [servizio(A1, VERA, SERVICE_REFILL, 120, 15), servizio(A2, ALESSANDRA, SERVICE_MASSAGE, 138, 10)],
    versioneVisita: null,
    attesi: [],
    avvisiConfermati: [],
    partenza: { operatriceId: VERA, inizio: 120 },
    ...altro,
  }
}

const righeDiInvio = (c: string) =>
  asOwner((x) => x.query<{ n: number }>('select count(*)::int n from invio where codice = $1', [c]).then((r) => r.rows[0].n))

/** La scheda di una visita salvata, riaperta dallo stato letto con la sessione di Vera. */
async function riaperta(visita = V1): Promise<SchedaSerializzata> {
  const stato = await leggiStato(await vera(), visita)
  return serializza(apriSchedaSuVisita(stato!, visita))
}

async function creaV1() {
  const r = await salvaVisita(await vera(), nuovaScheda(), codice())
  expect(r).toMatchObject({ tipo: 'esito', esito: 'salvata' })
}

beforeEach(async () => {
  await resetData()
  await seedFixture()
  // Il giovedì 12 marzo 2026 le tre lavorano 09:00–19:00: nessun avviso
  // «fuori orario» se non quelli che una prova costruisce.
  await asOwner((c) =>
    c.query(
      `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
       values ($1, 3, 108, 228), ($2, 3, 108, 228), ($3, 3, 108, 228)`,
      [VERA, ANNALISA, ALESSANDRA],
    ),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('salva: esiti e versioni (§4.1 regola 10, C3)', () => {
  it('una creazione riuscita restituisce salvata e le versioni nuove', async () => {
    const c = codice()
    const r = await salvaVisita(await vera(), nuovaScheda(), c)
    expect(r).toMatchObject({ tipo: 'esito', esito: 'salvata', messaggio: { testo: '✓ Salvata', spunta: true } })
    if (r.tipo !== 'esito') throw new Error('atteso un esito')
    expect(typeof r.visita).toBe('string')
    expect(r.appuntamenti!.map((a) => a.id)).toEqual([A1, A2])
    expect(r.appuntamenti!.every((a) => typeof a.versione === 'string' && Object.keys(a).length === 2)).toBe(true)
    expect(await righeDiInvio(c)).toBe(1)
    const stato = await leggiStato(await vera(), V1)
    expect(stato!.appuntamenti.map((a) => [a.id, a.operatrice, a.inizio, a.durata])).toEqual([
      [A1, VERA, 120, 15],
      [A2, ALESSANDRA, 138, 10],
    ])
  })

  it('le versioni restituite si rimandano indietro e il secondo salvataggio riesce', async () => {
    const r = await salvaVisita(await vera(), nuovaScheda(), codice())
    if (r.tipo !== 'esito') throw new Error('atteso un esito')
    const seconda = nuovaScheda({
      modo: 'modifica',
      versioneVisita: r.visita!,
      attesi: r.appuntamenti!,
      servizi: [servizio(A1, VERA, SERVICE_REFILL, 122, 15, false), servizio(A2, ALESSANDRA, SERVICE_MASSAGE, 138, 10, false)],
    })
    expect(await salvaVisita(await vera(), seconda, codice())).toMatchObject({ tipo: 'esito', esito: 'salvata' })
    expect((await leggiStato(await vera(), V1))!.appuntamenti[0].inizio).toBe(122)
  })

  it('dopo un modificata_altrove, la scheda che adotta stato e riproietta salva al secondo colpo', async () => {
    await creaV1()
    const vecchia = await riaperta()
    // Una collega sposta il massaggio.
    await asOwner((c) => c.query('update appointment set start_cell = 150 where id = $1', [A2]))
    const mia = { ...vecchia, servizi: vecchia.servizi.map((s) => (s.id === A1 ? { ...s, inizio: 122 } : s)) }
    const r = await salvaVisita(await vera(), mia, codice())
    expect(r).toMatchObject({ tipo: 'esito', esito: 'modificata_altrove', messaggio: { schedaAdottaStato: true } })
    if (r.tipo !== 'esito') throw new Error('atteso un esito')
    // §4.4, «La scheda aggiornata»: lo stato corrente, e si rifà a mano.
    const aggiornata = adottaStato({ ...mia, avvisiConfermati: new Set() }, r.stato!)
    const rifatta = serializza({ ...aggiornata, servizi: aggiornata.servizi.map((s) => (s.id === A1 ? { ...s, inizio: 122 } : s)) })
    expect(await salvaVisita(await vera(), rifatta, codice())).toMatchObject({ tipo: 'esito', esito: 'salvata' })
    const stato = await leggiStato(await vera(), V1)
    expect(stato!.appuntamenti.map((a) => [a.id, a.inizio])).toEqual([[A1, 122], [A2, 150]])
  })

  it('il server riproietta e riordina gli attesi che arrivano dal telefono (C3, a ogni chiamata)', async () => {
    await creaV1()
    const stato = (await leggiStato(await vera(), V1))!
    // Gli attesi COME LI DÀ lo stato, sei chiavi, e in ordine rovesciato: un
    // telefono che li passasse così darebbe modificata_altrove per sempre.
    const sporchi = [...stato.appuntamenti].reverse() as unknown as SchedaSerializzata['attesi']
    const s = { ...(await riaperta()), attesi: sporchi }
    const mossa = { ...s, servizi: s.servizi.map((x) => (x.id === A1 ? { ...x, inizio: 123 } : x)) }
    expect(await salvaVisita(await vera(), mossa, codice())).toMatchObject({ tipo: 'esito', esito: 'salvata' })
  })

  it('la gemella: dopo un modificata_altrove, passare stato COM È dà di nuovo modificata_altrove', async () => {
    await creaV1()
    const stato = (await leggiStato(await vera(), V1)) as StatoVisita
    // Direttamente sulla funzione, senza la proiezione del server: è la
    // trappola misurata il 25/09, e rende la prova qui sopra capace di fallire.
    const r = await (await vera()).rpc('salva_visita', {
      p_codice: codice(),
      p_visita: V1,
      p_cliente: CLIENT_MARIA,
      p_cliente_nuova: null,
      p_data: DAY_ONE,
      p_appuntamenti: stato.appuntamenti.map(({ id, operatrice, servizio, durata }) => ({ id, operatrice, servizio, inizio: id === A1 ? 123 : 138, durata })),
      p_visita_attesa: stato.visita,
      p_attesi: stato.appuntamenti,
    })
    expect(r.error).toBeNull()
    expect(r.data.esito).toBe('modificata_altrove')
  })

  it('una collega che aggiunge un servizio dà modificata_altrove, e il suo servizio RESTA (§8.2, B5)', async () => {
    await creaV1()
    const vecchia = await riaperta()
    await asOwner((c) =>
      c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5, 160, 15)`,
        [A3, V1, ANNALISA, SERVICE_REFILL, DAY_ONE],
      ),
    )
    const mia = { ...vecchia, servizi: vecchia.servizi.map((s) => (s.id === A1 ? { ...s, inizio: 122 } : s)) }
    const r = await salvaVisita(await vera(), mia, codice())
    expect(r).toMatchObject({ tipo: 'esito', esito: 'modificata_altrove' })
    if (r.tipo !== 'esito') throw new Error('atteso un esito')
    expect(r.stato!.appuntamenti.map((a) => a.id)).toContain(A3)
    const stato = await leggiStato(await vera(), V1)
    expect(stato!.appuntamenti.map((a) => [a.id, a.inizio])).toEqual([[A1, 120], [A2, 138], [A3, 160]])
  })

  it('una creazione su un id che esiste già dà esiste_gia senza scrivere, e mostra la visita com è ora', async () => {
    await creaV1()
    const prima = await leggiStato(await vera(), V1)
    const diversa = nuovaScheda({ servizi: [servizio(B1, VERA, SERVICE_REFILL, 150, 15)] })
    const r = await salvaVisita(await vera(), diversa, codice())
    expect(r).toMatchObject({
      tipo: 'esito',
      esito: 'esiste_gia',
      messaggio: { testo: 'È diversa da come l’avevi lasciata: ecco com’è ora', schedaAdottaStato: true, spunta: false },
    })
    if (r.tipo !== 'esito') throw new Error('atteso un esito')
    expect(r.stato).toEqual(prima)
    expect(await leggiStato(await vera(), V1)).toEqual(prima)
  })

  it('la gemella: un esiste_gia sulla visita UGUALE alla scheda è «✓ Risulta salvata» (§4.4 riga 2)', async () => {
    await creaV1()
    const r = await salvaVisita(await vera(), nuovaScheda(), codice())
    expect(r).toMatchObject({ tipo: 'esito', esito: 'esiste_gia', messaggio: { testo: '✓ Risulta salvata', spunta: true } })
  })

  it('la cliente nuova si traduce nelle chiavi che salva_visita legge, e si crea con la visita', async () => {
    const s = nuovaScheda({
      cliente: { tipo: 'nuova', id: NUOVA, nome: '  Giulia Bianchi ', telefono: '+393471234567', meseDiNascita: 2, giornoDiNascita: 29 },
    })
    expect(await salvaVisita(await vera(), s, codice())).toMatchObject({ tipo: 'esito', esito: 'salvata' })
    const riga = await asOwner((c) =>
      c.query('select full_name, phone, birth_month, birth_day from client where id = $1', [NUOVA]).then((r) => r.rows[0]),
    )
    expect(riga).toEqual({ full_name: 'Giulia Bianchi', phone: '+393471234567', birth_month: 2, birth_day: 29 })
  })
})

describe('elimina e togli', () => {
  it('cancella_visita su una già cancellata dà gia_cancellata', async () => {
    await creaV1()
    const s = await riaperta()
    const r = await eliminaVisita(await vera(), V1, s.versioneVisita!, s.attesi, codice())
    expect(r).toMatchObject({ tipo: 'esito', esito: 'cancellata', messaggio: { testo: '✓ Cancellata', spunta: true } })
    const di_nuovo = await eliminaVisita(await vera(), V1, s.versioneVisita!, s.attesi, codice())
    expect(di_nuovo).toMatchObject({ tipo: 'esito', esito: 'gia_cancellata', messaggio: { testo: 'Era già stata cancellata', ricaricaIlGiorno: true } })
  })

  it('«Togli» manda tutta la bozza: il servizio tolto sparisce e le altre modifiche si salvano (decisione del 06/10)', async () => {
    await creaV1()
    const s = await riaperta()
    const bozza = { ...s, servizi: s.servizi.filter((x) => x.id !== A2).map((x) => ({ ...x, inizio: 130 })) }
    expect(await togliServizio(await vera(), bozza, codice())).toMatchObject({ tipo: 'esito', esito: 'salvata' })
    const stato = await leggiStato(await vera(), V1)
    expect(stato!.appuntamenti.map((a) => [a.id, a.inizio])).toEqual([[A1, 130]])
  })
})

describe('passi 1, 2 e 3: niente arriva alla funzione', () => {
  it('un account che non è operatrice riceve l uscita forzata (passo 1)', async () => {
    const estranea = conToken((await sessioneDi(OUTSIDER_AUTH)).accessToken)
    const c = codice()
    expect(await salvaVisita(estranea, nuovaScheda(), c)).toEqual({ tipo: 'uscita_forzata' })
    expect(await righeDiInvio(c)).toBe(0)
  })

  it('un elenco vuoto non arriva mai alla funzione: lo ferma il passo 2', async () => {
    const c = codice()
    const r = await salvaVisita(await vera(), nuovaScheda({ servizi: [] }), c)
    expect(r).toMatchObject({ tipo: 'non_valida' })
    expect(await righeDiInvio(c)).toBe(0)
  })

  it('un avviso non confermato dà da_confermare e la funzione NON viene chiamata (D3-19)', async () => {
    const fuori = nuovaScheda({ servizi: [servizio(A1, VERA, SERVICE_REFILL, 230, 15), servizio(A2, ALESSANDRA, SERVICE_MASSAGE, 138, 10)] })
    const c = codice()
    expect(await salvaVisita(await vera(), fuori, c)).toEqual({ tipo: 'da_confermare', chiavi: [`fuori-orario:${A1}`] })
    expect(await righeDiInvio(c)).toBe(0)
    // la gemella: confermata la chiave, salva
    const d = codice()
    expect(await salvaVisita(await vera(), { ...fuori, avvisiConfermati: [`fuori-orario:${A1}`] }, d)).toMatchObject({ esito: 'salvata' })
    expect(await righeDiInvio(d)).toBe(1)
  })

  it('un conflitto preventivo dà la frase con TUTTI i conflitti, senza chiamare la funzione (§10.1)', async () => {
    await salvaVisita(await vera(), nuovaScheda({ visitaId: V2, cliente: { tipo: 'esistente', id: CLIENT_LUCIA }, servizi: [
      servizio(B1, VERA, SERVICE_REFILL, 120, 15), servizio(B2, ALESSANDRA, SERVICE_MASSAGE, 140, 10),
    ] }), codice())
    const c = codice()
    const r = await salvaVisita(await vera(), nuovaScheda(), c)
    expect(r).toEqual({
      tipo: 'conflitto',
      frase: 'Vera ha un appuntamento alle 10:00 con Lucia Ciccarè; Alessandra ha un appuntamento alle 11:40 con Lucia Ciccarè',
      vaiA: B1,
    })
    expect(await righeDiInvio(c)).toBe(0)
  })
})

describe('passi 6 e 7: dopo la scrittura', () => {
  it('un 23505 sulla cella dà la frase con TUTTI i conflitti, rifacendo il passo 3 (§4.3 passo 6)', async () => {
    // La collega scrive DOPO il controllo preventivo e prima della funzione:
    // il controllo passa, e il vincolo scatta.
    const r = await salvaVisita(await vera(), nuovaScheda(), codice(), {
      spiaTentativi: async (t) => {
        if (t !== 0) return
        await asOwner(async (c) => {
          await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3)', [V2, CLIENT_LUCIA, DAY_ONE])
          await c.query(
            `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
             values ($1, $3, $4, $5, $7, 120, 15), ($2, $3, $6, $8, $7, 140, 10)`,
            [B1, B2, V2, VERA, SERVICE_REFILL, ALESSANDRA, DAY_ONE, SERVICE_MASSAGE],
          )
        })
      },
    })
    expect(r).toEqual({
      tipo: 'conflitto',
      frase: 'Vera ha un appuntamento alle 10:00 con Lucia Ciccarè; Alessandra ha un appuntamento alle 11:40 con Lucia Ciccarè',
      vaiA: B1,
    })
    expect(await leggiStato(await vera(), V1)).toBeNull()
  })

  it('un 23503 sulla cliente cancellata fra due invii dà la frase giusta e nessuna offerta', async () => {
    expect(
      await salvaVisita(await vera(), nuovaScheda({ visitaId: V2, cliente: { tipo: 'esistente', id: CLIENT_LUCIA }, servizi: [servizio(B1, VERA, SERVICE_REFILL, 160, 15)] }), codice()),
    ).toMatchObject({ esito: 'salvata' })
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_LUCIA]))
    const r = await salvaVisita(await vera(), nuovaScheda({ cliente: { tipo: 'esistente', id: CLIENT_LUCIA } }), codice())
    expect(r).toEqual({
      tipo: 'fallita',
      sqlstate: '23503',
      testo: 'La cliente è stata cancellata',
      messaggio: {
        testo: 'La cliente è stata cancellata',
        spunta: false,
        schedaAdottaStato: false,
        ricaricaIlGiorno: false,
        ricaricaLaScheda: false,
        uscitaForzata: false,
      },
    })
  })

  // L'account si chiude DOPO che la funzione ha risposto e PRIMA del messaggio:
  // un client il cui `fetch` disattiva Vera appena torna la risposta di
  // `salva_visita`. Sonda 4 del piano: senza queste tre, togliere il ricontrollo
  // sul ramo degli esiti dava 0 rosse.
  const conChiusuraDopoLaFunzione = async () => {
    const token = (await sessioneDi(VERA_AUTH)).accessToken
    return createClient(URL, ANON, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: async (input, init) => {
          const risposta = await fetch(input, init)
          if (String(input).includes('/rpc/salva_visita')) {
            await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))
          }
          return risposta
        },
      },
    })
  }

  it('un modificata_altrove con l account chiuso nel frattempo è l uscita forzata, senza lo stato (passo 7)', async () => {
    await creaV1()
    const vecchia = await riaperta()
    await asOwner((c) => c.query('update appointment set start_cell = 150 where id = $1', [A2]))
    expect(await salvaVisita(await conChiusuraDopoLaFunzione(), vecchia, codice())).toEqual({ tipo: 'uscita_forzata' })
  })

  it('un salvata SENZA alcun UPDATE con l account chiuso nel frattempo è l uscita forzata: non prova niente (passo 7)', async () => {
    await creaV1()
    expect(await salvaVisita(await conChiusuraDopoLaFunzione(), await riaperta(), codice())).toEqual({ tipo: 'uscita_forzata' })
  })

  it('la gemella: un salvata che HA scritto resta ✓ anche se l account si chiude dopo', async () => {
    await creaV1()
    const s = await riaperta()
    const mossa = { ...s, servizi: s.servizi.map((x) => (x.id === A1 ? { ...x, inizio: 122 } : x)) }
    expect(await salvaVisita(await conChiusuraDopoLaFunzione(), mossa, codice())).toMatchObject({ tipo: 'esito', esito: 'salvata' })
  })

  it('l account chiuso fra il passo 1 e la scrittura dà l uscita forzata, non il messaggio del 42501 (passo 7)', async () => {
    const r = await salvaVisita(await vera(), nuovaScheda(), codice(), {
      spiaTentativi: async (t) => {
        if (t === 0) await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))
      },
    })
    expect(r).toEqual({ tipo: 'uscita_forzata' })
  })
})

describe('revisione del Task 8: dopo la funzione, niente frasi false né vuote', () => {
  /** Il client di Vera con un `fetch` che la prova governa: `dopo` vede ogni richiesta e può sostituire la risposta. */
  const conFetch = async (dopo: (url: string, vera: () => Promise<Response>) => Promise<Response>) => {
    const token = (await sessioneDi(VERA_AUTH)).accessToken
    return createClient(URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => dopo(String(input), () => fetch(input, init)) },
    })
  }
  const PER_SEMPRE = 'per-sempre'
  let guastoUtente = ''
  /** Dopo la risposta di `salva_visita`, ogni `GET /auth/v1/user` cade per la rete. */
  const ricontrolloInGuasto = () =>
    conFetch(async (url, vera) => {
      if (url.includes('/rpc/salva_visita')) guastoUtente = PER_SEMPRE
      if (url.includes('/auth/v1/user') && guastoUtente === PER_SEMPRE) throw new TypeError('fetch failed')
      return vera()
    })

  beforeEach(() => {
    guastoUtente = ''
  })

  it('una rilettura fallita dopo esiste_gia è «Non so», non «riprova»: la visita c è (reperto 1)', async () => {
    await creaV1()
    const client = await conFetch(async (url, vera) =>
      url.includes('/rpc/stato_visita')
        ? new Response(JSON.stringify({ code: '57014', message: 'canceling statement due to statement timeout' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        : vera(),
    )
    expect(await salvaVisita(client, nuovaScheda(), codice())).toEqual({ tipo: 'non_so' })
  })

  it('un modificata_altrove col ricontrollo in guasto dà «riprova»: la funzione non ha scritto (reperto 2)', async () => {
    await creaV1()
    const vecchia = await riaperta()
    await asOwner((c) => c.query('update appointment set start_cell = 150 where id = $1', [A2]))
    const r = await salvaVisita(await ricontrolloInGuasto(), vecchia, codice())
    expect(r).toMatchObject({ tipo: 'fallita', testo: 'Non sono riuscita a salvare, riprova' })
  })

  it('la gemella: un salvata senza UPDATE col ricontrollo in guasto resta «Non so», perché non prova niente', async () => {
    await creaV1()
    expect(await salvaVisita(await ricontrolloInGuasto(), await riaperta(), codice())).toEqual({ tipo: 'non_so' })
  })

  it('un 42501 col ricontrollo in guasto dà la frase del 42501, non «Non so»: la scrittura è annullata (reperto 2)', async () => {
    const r = await salvaVisita(await ricontrolloInGuasto(), nuovaScheda(), codice(), {
      // La sessione sparisce prima della funzione: `is_active_operator()` è falsa, e la funzione risponde 42501.
      spiaTentativi: async (t) => {
        if (t === 0) await asOwner((c) => c.query('delete from auth.sessions where user_id = $1', [VERA_AUTH]))
      },
    })
    expect(r).toMatchObject({ tipo: 'fallita', sqlstate: '42501', messaggio: { ricaricaIlGiorno: true } })
  })

  it('un 23505 sulla cella che alla rilettura non trova più il conflitto dice «riprova», mai una riga vuota (reperto 3)', async () => {
    const client = await conFetch(async (url, vera) => {
      const r = await vera()
      // La collega che aveva preso la cella la libera subito dopo.
      if (url.includes('/rpc/salva_visita')) await asOwner((c) => c.query('delete from visit where id = $1', [V2]))
      return r
    })
    const r = await salvaVisita(client, nuovaScheda(), codice(), {
      spiaTentativi: async (t) => {
        if (t !== 0) return
        await asOwner(async (c) => {
          await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3)', [V2, CLIENT_LUCIA, DAY_ONE])
          await c.query(
            `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
             values ($1, $2, $3, $4, $5, 120, 15)`,
            [B1, V2, VERA, SERVICE_REFILL, DAY_ONE],
          )
        })
      },
    })
    expect(r).toMatchObject({ tipo: 'fallita', sqlstate: '23505', testo: 'Non sono riuscita a salvare, riprova' })
  })

  it('un invio doppio concorrente (23505 su visit_pkey) non ripete: rilegge e mostra la visita (reperto 4)', async () => {
    // Un'altra transazione crea V1 e non ha ancora committato: la funzione non
    // la vede, la inserisce, e aspetta sull'indice; al commit dell'altra, 23505.
    const altra = await connect()
    const osservatrice = await connect()
    try {
      await altra.query('begin')
      await altra.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3)', [V1, CLIENT_MARIA, DAY_ONE])
      const pid = (await altra.query<{ p: number }>('select pg_backend_pid() p')).rows[0].p
      const inVolo = salvaVisita(await vera(), nuovaScheda(), codice())
      const fine = Date.now() + 5_000
      while ((await osservatrice.query<{ n: number }>('select count(*)::int n from pg_stat_activity where $1 = any(pg_blocking_pids(pid))', [pid])).rows[0].n === 0) {
        if (Date.now() > fine) throw new Error('la funzione non si è mai fermata sulla chiave')
        await new Promise((r) => setTimeout(r, 20))
      }
      await altra.query('commit')
      const r = await inVolo
      expect(r).toMatchObject({
        tipo: 'esito',
        esito: 'esiste_gia',
        messaggio: { testo: 'È diversa da come l’avevi lasciata: ecco com’è ora', schedaAdottaStato: true },
      })
    } finally {
      await altra.query('rollback').catch(() => {})
      await altra.end()
      await osservatrice.end()
    }
  })

  it('si ritenta SOLO su 40P01: un guasto senza SQLSTATE è un tentativo solo, e «Non so» (C5, reperto 5)', async () => {
    const client = await conFetch(async (url, vera) => {
      if (url.includes('/rpc/salva_visita')) throw new TypeError('fetch failed')
      return vera()
    })
    const spia: number[] = []
    const r = await salvaVisita(client, nuovaScheda(), codice(), { spiaTentativi: (t) => void spia.push(t), dormi: async () => {} })
    expect(spia).toEqual([0])
    expect(r).toEqual({ tipo: 'non_so' })
  })
})

describe('la quinta decisione: nessun ritentativo dopo 7 s dal tocco (opzione b, 06/10/2026)', () => {
  // Il server smette quando il telefono smette di aspettare: quattro tentativi
  // da 8 s costerebbero 32 s contro i 10 s di D3-9. L'orologio è finto, e
  // ogni tentativo lo fa avanzare di `passo` millisecondi.
  const sempre40P01 = async () => {
    const token = (await sessioneDi(VERA_AUTH)).accessToken
    return createClient(URL, ANON, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: async (input, init) =>
          String(input).includes('/rpc/salva_visita')
            ? new Response(JSON.stringify({ code: '40P01', message: 'deadlock detected' }), { status: 500, headers: { 'content-type': 'application/json' } })
            : fetch(input, init),
      },
    })
  }
  async function tentativiCon(passo: number) {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let t = 0
    const spia: number[] = []
    const r = await salvaVisita(await sempre40P01(), nuovaScheda(), codice(), {
      spiaTentativi: (n) => {
        spia.push(n)
        t += passo
      },
      dormi: async () => {},
      adesso: () => t,
    })
    return { r, spia }
  }

  it('oltre i 7 s i tentativi si fermano prima di 4, e la risposta è la fallita del 40P01', async () => {
    const { r, spia } = await tentativiCon(4_000)
    expect(spia.length).toBeLessThan(4)
    expect(spia).toEqual([0, 1])
    expect(r).toMatchObject({ tipo: 'fallita', sqlstate: '40P01', testo: 'Non sono riuscita a salvare, riprova' })
  })

  it('la gemella: sotto i 7 s arriva a 4 tentativi, cioè 3 ritentativi', async () => {
    const { r, spia } = await tentativiCon(1_000)
    expect(spia).toEqual([0, 1, 2, 3])
    expect(r).toMatchObject({ tipo: 'fallita', sqlstate: '40P01' })
  })
})
