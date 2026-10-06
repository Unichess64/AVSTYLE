// tests/app/spostamento.test.ts
//
// Il trascinamento e «Annulla» contro Supabase locale, con la sessione vera di
// Vera (spec 3a §5.1, piano 3a-2 Task 10, Passo 4). Si prova il CORPO, come in
// `scrittura.test.ts`: il guscio `'use server'` gli passa il client di
// `clientServer()`.
//
// DA DOVE VENGONO LE VERSIONI al primo gesto: il telefono non le ha
// (`AppuntamentoLetto` non ne porta, decisione del Task 5). Le legge il SERVER
// con `stato_visita`, nella stessa Server Action — un viaggio in meno —, e
// controlla che la visita letta sia dove l'agenda la mostrava: altrimenti
// l'agenda era vecchia, e scrivere con versioni fresche cancellerebbe in
// silenzio lo spostamento di una collega. Dopo il ✓ il telefono adotta le
// versioni restituite e le rimanda: allora decide il database.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mosso } from '../../src/dominio/trascinamento'
import type { StatoVisita } from '../../src/dominio/stato-visita'
import { leggiStato } from '../../src/server/lettura-scheda'
import { type RichiestaSpostamento, eliminaVisita, riportaVisita, salvaVisita, spostaVisita } from '../../src/server/scrittura-visita'
import { ALESSANDRA, ANNALISA, VERA, VERA_AUTH, asOwner, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const vera = async (): Promise<SupabaseClient> =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${(await sessioneDi(VERA_AUTH)).accessToken}` } } })

/** Il client di Vera con un `fetch` che la prova governa. */
const conFetch = async (dopo: (url: string, vera: () => Promise<Response>) => Promise<Response>) => {
  const token = (await sessioneDi(VERA_AUTH)).accessToken
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => dopo(String(input), () => fetch(input, init)) },
  })
}
const errore = (code: string) =>
  new Response(JSON.stringify({ code, message: code }), { status: 500, headers: { 'content-type': 'application/json' } })

// V1, INTERA: due Refill di Vera, uno dopo l'altro (Refill non ha pausa).
const V1 = '50000000-0000-4000-8000-000000000c01'
const A1 = '60000000-0000-4000-8000-000000000c01'
const A2 = '60000000-0000-4000-8000-000000000c02'
// V2, SPEZZATA: un Refill di Annalisa e un Massaggio di Alessandra.
const V2 = '50000000-0000-4000-8000-000000000c02'
const B1 = '60000000-0000-4000-8000-000000000c11'
const B2 = '60000000-0000-4000-8000-000000000c12'
// V3: un Refill di Vera alle 14:10, contro cui V1 va in conflitto.
const V3 = '50000000-0000-4000-8000-000000000c03'
const C1 = '60000000-0000-4000-8000-000000000c21'
const codice = () => crypto.randomUUID()

const servizio = (id: string, operatriceId: string, servizioId: string, inizio: number, durata: number) => ({
  id, nuovo: true, operatriceId, servizioId, inizio, durata, durataAMano: false, segueIlPrecedente: false,
})

async function crea(visitaId: string, cliente: string, servizi: ReturnType<typeof servizio>[], avvisiConfermati: string[] = []) {
  const r = await salvaVisita(
    await vera(),
    {
      visitaId,
      modo: 'creazione',
      cliente: { tipo: 'esistente', id: cliente },
      clienteEsisteAncora: true,
      data: DAY_ONE,
      servizi,
      versioneVisita: null,
      attesi: [],
      avvisiConfermati,
      partenza: { operatriceId: servizi[0].operatriceId, inizio: servizi[0].inizio },
    },
    codice(),
  )
  expect(r).toMatchObject({ tipo: 'esito', esito: 'salvata' })
}

/** V1 alle 10:00 (A1 10:00–11:30, A2 11:30–12:30), o all'inizio dato. */
const creaV1 = (inizio = 120, confermati: string[] = []) =>
  crea(V1, CLIENT_MARIA, [servizio(A1, VERA, SERVICE_REFILL, inizio, 18), servizio(A2, VERA, SERVICE_REFILL, inizio + 18, 12)], confermati)

/** Lo spostamento di V1 di `scarto` celle, con le versioni date (o lette dal server). */
function spostaV1(da: number, scarto: number, versioni: RichiestaSpostamento['versioni'] = null): RichiestaSpostamento {
  const mossi: Mosso[] = [
    { id: A1, da, a: da + scarto },
    { id: A2, da: da + 18, a: da + 18 + scarto },
  ]
  return { visitaId: V1, data: DAY_ONE, mossi, versioni }
}

const inverti = (r: RichiestaSpostamento, versioni: RichiestaSpostamento['versioni']): RichiestaSpostamento => ({
  ...r,
  mossi: r.mossi.map((m) => ({ id: m.id, da: m.a, a: m.da })),
  versioni,
})

const posizioni = async (visita: string) => ((await leggiStato(await vera(), visita)) as StatoVisita).appuntamenti.map((a) => [a.id, a.inizio])
const righeDiInvio = (c: string) =>
  asOwner((x) => x.query<{ n: number }>('select count(*)::int n from invio where codice = $1', [c]).then((r) => r.rows[0].n))

/** Le versioni di una risposta `salvata`, nella forma che il telefono adotta. */
function versioniDi(r: Awaited<ReturnType<typeof spostaVisita>>): NonNullable<RichiestaSpostamento['versioni']> {
  if (r.tipo !== 'esito' || r.esito !== 'salvata') throw new Error(`atteso salvata, arrivato ${JSON.stringify(r)}`)
  return { visita: r.visita!, attesi: r.appuntamenti! }
}

beforeEach(async () => {
  await resetData()
  await seedFixture()
  // Giovedì 12 marzo 2026: le tre lavorano 09:00–19:00.
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

describe('lo spostamento (§5.1, Passo 4)', () => {
  it('uno spostamento nello stesso giorno riesce: il caso normale di §5.1', async () => {
    await creaV1()
    const c = codice()
    const r = await spostaVisita(await vera(), spostaV1(120, 6), c)
    expect(r).toMatchObject({ tipo: 'esito', esito: 'salvata', messaggio: { spunta: true } })
    expect(await posizioni(V1)).toEqual([[A1, 126], [A2, 144]])
    expect(await righeDiInvio(c)).toBe(1)
  })

  it('dopo il ✓ l agenda adotta le versioni restituite, e il secondo trascinamento riesce', async () => {
    await creaV1()
    const primo = await spostaVisita(await vera(), spostaV1(120, 6), codice())
    const secondo = await spostaVisita(await vera(), spostaV1(126, 6, versioniDi(primo)), codice())
    expect(secondo).toMatchObject({ tipo: 'esito', esito: 'salvata' })
    expect(await posizioni(V1)).toEqual([[A1, 132], [A2, 150]])
  })

  it('la gemella: senza adottare le versioni, il secondo trascinamento dà modificata_altrove', async () => {
    await creaV1()
    const s = (await leggiStato(await vera(), V1))!
    const vecchie = { visita: s.visita, attesi: s.appuntamenti.map(({ id, versione }) => ({ id, versione })) }
    expect(await spostaVisita(await vera(), spostaV1(120, 6, vecchie), codice())).toMatchObject({ esito: 'salvata' })
    const secondo = await spostaVisita(await vera(), spostaV1(126, 6, vecchie), codice())
    expect(secondo).toMatchObject({ tipo: 'esito', esito: 'modificata_altrove' })
    expect(await posizioni(V1)).toEqual([[A1, 126], [A2, 144]])
  })

  it('uno spostamento alza la versione anche degli appuntamenti che non si muovono (esenzione dalla regola 8)', async () => {
    await creaV1()
    const prima = (await leggiStato(await vera(), V1))!
    // A1 sale di mezz'ora, A2 resta dov'è.
    const r = await spostaVisita(
      await vera(),
      { visitaId: V1, data: DAY_ONE, mossi: [{ id: A1, da: 120, a: 114 }, { id: A2, da: 138, a: 138 }], versioni: null },
      codice(),
    )
    expect(r).toMatchObject({ esito: 'salvata' })
    const dopo = (await leggiStato(await vera(), V1))!
    expect(dopo.appuntamenti.find((a) => a.id === A2)!.inizio).toBe(138)
    expect(dopo.appuntamenti.find((a) => a.id === A2)!.versione).not.toBe(prima.appuntamenti.find((a) => a.id === A2)!.versione)
    expect(dopo.visita).not.toBe(prima.visita)
  })

  it('l insieme di destinazione diverso dall atteso è rifiutato dalla funzione (22023)', async () => {
    await creaV1()
    const s = (await leggiStato(await vera(), V1))!
    const r = await (await vera()).rpc('sposta_visita_a', {
      p_codice: codice(),
      p_visita: V1,
      p_data: DAY_ONE,
      p_destinazioni: [{ id: A1, inizio: 126 }],
      p_visita_attesa: s.visita,
      p_attesi: s.appuntamenti.map(({ id, versione }) => ({ id, versione })),
    })
    expect(r.error?.code).toBe('22023')
    expect(await posizioni(V1)).toEqual([[A1, 120], [A2, 138]])
  })

  it('e il corpo non manda mai un insieme diverso: un id che non è della visita non scrive niente', async () => {
    await creaV1()
    await crea(V2, CLIENT_LUCIA, [servizio(B1, ANNALISA, SERVICE_REFILL, 120, 18), servizio(B2, ALESSANDRA, SERVICE_MASSAGE, 150, 10)])
    const c = codice()
    const r = await spostaVisita(await vera(), { visitaId: V1, data: DAY_ONE, mossi: [{ id: B1, da: 120, a: 126 }], versioni: null }, c)
    // la visita non ha quel servizio: è cambiata, e lo si dice con lo stato com'è ora
    expect(r).toMatchObject({ tipo: 'esito', esito: 'modificata_altrove' })
    expect(await righeDiInvio(c)).toBe(0)
    expect(await posizioni(V1)).toEqual([[A1, 120], [A2, 138]])
    expect(await posizioni(V2)).toEqual([[B1, 120], [B2, 150]])
  })

  it('un blocco NON intero passa da salva_visita con l insieme completo: l altro servizio resta, versione compresa', async () => {
    await crea(V2, CLIENT_LUCIA, [servizio(B1, ANNALISA, SERVICE_REFILL, 120, 18), servizio(B2, ALESSANDRA, SERVICE_MASSAGE, 150, 10)])
    const prima = (await leggiStato(await vera(), V2))!
    const r = await spostaVisita(await vera(), { visitaId: V2, data: DAY_ONE, mossi: [{ id: B1, da: 120, a: 126 }], versioni: null }, codice())
    expect(r).toMatchObject({ tipo: 'esito', esito: 'salvata' })
    const dopo = (await leggiStato(await vera(), V2))!
    expect(dopo.appuntamenti.map((a) => [a.id, a.inizio])).toEqual([[B1, 126], [B2, 150]])
    // regola 8: salva_visita aggiorna solo ciò che cambia
    expect(dopo.appuntamenti.find((a) => a.id === B2)!.versione).toBe(prima.appuntamenti.find((a) => a.id === B2)!.versione)
    // e le versioni restituite coprono TUTTA la visita, per il gesto dopo
    expect(versioniDi(r).attesi.map((a) => a.id)).toEqual([B1, B2])
  })

  it('al primo gesto, con l agenda vecchia (una collega l ha già spostata): modificata_altrove, e NIENTE è scritto', async () => {
    await creaV1()
    await asOwner((c) => c.query('update appointment set start_cell = start_cell + 30 where visit_id = $1', [V1]))
    const c = codice()
    // l'agenda mostrava ancora le 10:00
    const r = await spostaVisita(await vera(), spostaV1(120, 6), c)
    expect(r).toMatchObject({ tipo: 'esito', esito: 'modificata_altrove' })
    if (r.tipo !== 'esito') throw new Error('atteso un esito')
    expect(r.stato!.appuntamenti.map((a) => a.inizio)).toEqual([150, 168])
    expect(await posizioni(V1)).toEqual([[A1, 150], [A2, 168]])
    expect(await righeDiInvio(c)).toBe(0)
  })

  it('la gemella: con l agenda allineata alla lettura, lo stesso primo gesto scrive', async () => {
    await creaV1()
    await asOwner((c) => c.query('update appointment set start_cell = start_cell + 30 where visit_id = $1', [V1]))
    expect(await spostaVisita(await vera(), spostaV1(150, 6), codice())).toMatchObject({ esito: 'salvata' })
    expect(await posizioni(V1)).toEqual([[A1, 156], [A2, 174]])
  })

  it('una visita cancellata dà cancellata_altrove', async () => {
    await creaV1()
    const s = (await leggiStato(await vera(), V1))!
    await eliminaVisita(await vera(), V1, s.visita, s.appuntamenti, codice())
    expect(await spostaVisita(await vera(), spostaV1(120, 6), codice())).toMatchObject({ tipo: 'esito', esito: 'cancellata_altrove' })
  })

  it('un conflitto con un altra visita si ferma prima di scrivere', async () => {
    await creaV1()
    await crea(V3, CLIENT_LUCIA, [servizio(C1, VERA, SERVICE_REFILL, 170, 18)])
    const c = codice()
    const r = await spostaVisita(await vera(), spostaV1(120, 36), c)
    expect(r).toMatchObject({ tipo: 'conflitto' })
    expect(await righeDiInvio(c)).toBe(0)
    expect(await posizioni(V1)).toEqual([[A1, 120], [A2, 138]])
  })

  it('verso il fuori orario si ferma con da_confermare: l avviso è nuovo', async () => {
    await creaV1()
    const r = await spostaVisita(await vera(), spostaV1(120, 84), codice())
    expect(r).toMatchObject({ tipo: 'da_confermare' })
    if (r.tipo !== 'da_confermare') throw new Error('atteso da_confermare')
    expect(r.chiavi).toContain(`fuori-orario:${A2}`)
    expect(await posizioni(V1)).toEqual([[A1, 120], [A2, 138]])
  })

  it('gli avvisi che la posizione di partenza aveva già passano come confermati', async () => {
    // V1 alle 08:20, fuori orario e accettata; scende alle 08:30, ancora fuori.
    await creaV1(100, [`fuori-orario:${A1}`])
    expect(await spostaVisita(await vera(), spostaV1(100, 2), codice())).toMatchObject({ esito: 'salvata' })
    expect(await posizioni(V1)).toEqual([[A1, 102], [A2, 120]])
  })

  it('scarto zero, o un appuntamento oltre la mezzanotte: non_valida, e nessun invio', async () => {
    await creaV1()
    const c1 = codice()
    expect(await spostaVisita(await vera(), spostaV1(120, 0), c1)).toMatchObject({ tipo: 'non_valida' })
    const c2 = codice()
    expect(await spostaVisita(await vera(), spostaV1(120, 140), c2)).toMatchObject({ tipo: 'non_valida' })
    expect(await righeDiInvio(c1)).toBe(0)
    expect(await righeDiInvio(c2)).toBe(0)
  })

  it('57014: la visita si RILEGGE, e la risposta porta lo stato letto', async () => {
    await creaV1()
    const client = await conFetch(async (url, vera) => (url.includes('/rpc/sposta_visita_a') ? errore('57014') : vera()))
    const r = await spostaVisita(client, spostaV1(120, 6), codice())
    expect(r).toMatchObject({ tipo: 'fallita', sqlstate: '57014' })
    if (r.tipo !== 'fallita') throw new Error('atteso fallita')
    expect(r.stato!.appuntamenti.map((a) => a.inizio)).toEqual([120, 138])
  })

  it('sposta passa dallo stesso chiama(): un 40P01 si ritenta con lo stesso codice (C5)', async () => {
    await creaV1()
    let volte = 0
    const client = await conFetch(async (url, vera) => {
      if (url.includes('/rpc/sposta_visita_a') && volte++ === 0) return errore('40P01')
      return vera()
    })
    const c = codice()
    const spia: number[] = []
    const r = await spostaVisita(client, spostaV1(120, 6), c, { spiaTentativi: (t) => void spia.push(t), dormi: async () => {} })
    expect(r).toMatchObject({ esito: 'salvata' })
    expect(spia).toEqual([0, 1])
    expect(await righeDiInvio(c)).toBe(1)
  })
})

describe('«Annulla» (§5.1)', () => {
  it('«Annulla» con le versioni adottate riporta la visita e restituisce salvata', async () => {
    await creaV1()
    const andata = spostaV1(120, 6)
    const r = await spostaVisita(await vera(), andata, codice())
    const ritorno = await riportaVisita(await vera(), inverti(andata, versioniDi(r)), codice())
    expect(ritorno).toMatchObject({ tipo: 'esito', esito: 'salvata' })
    expect(await posizioni(V1)).toEqual([[A1, 120], [A2, 138]])
  })

  it('con una collega passata nel mezzo, «Annulla» non scrive: modificata_altrove', async () => {
    await creaV1()
    const andata = spostaV1(120, 6)
    const r = await spostaVisita(await vera(), andata, codice())
    await asOwner((c) => c.query('update appointment set cell_count = 15 where id = $1', [A2]))
    expect(await riportaVisita(await vera(), inverti(andata, versioniDi(r)), codice())).toMatchObject({ esito: 'modificata_altrove' })
    expect(await posizioni(V1)).toEqual([[A1, 126], [A2, 144]])
  })

  it('e anche con una collega che ha cambiato SOLO la visita (la cliente): decide la versione della visita', async () => {
    await creaV1()
    const andata = spostaV1(120, 6)
    const r = await spostaVisita(await vera(), andata, codice())
    await asOwner((c) => c.query('update visit set client_id = $1 where id = $2', [CLIENT_LUCIA, V1]))
    expect(await riportaVisita(await vera(), inverti(andata, versioniDi(r)), codice())).toMatchObject({ esito: 'modificata_altrove' })
    expect(await posizioni(V1)).toEqual([[A1, 126], [A2, 144]])
  })

  it('«Annulla» senza le versioni adottate non parte', async () => {
    await creaV1()
    const andata = spostaV1(120, 6)
    await spostaVisita(await vera(), andata, codice())
    const c = codice()
    expect(await riportaVisita(await vera(), inverti(andata, null), c)).toMatchObject({ tipo: 'non_valida' })
    expect(await righeDiInvio(c)).toBe(0)
  })

  it('riportare verso una posizione fuori orario già accettata NON riapre la scheda', async () => {
    await creaV1(100, [`fuori-orario:${A1}`])
    // fuori orario → dentro: nessun avviso all'arrivo
    const andata = spostaV1(100, 20)
    const r = await spostaVisita(await vera(), andata, codice())
    expect(r).toMatchObject({ esito: 'salvata' })
    // e indietro, dove l'avviso c'era già
    expect(await riportaVisita(await vera(), inverti(andata, versioniDi(r)), codice())).toMatchObject({ esito: 'salvata' })
    expect(await posizioni(V1)).toEqual([[A1, 100], [A2, 118]])
  })
})
