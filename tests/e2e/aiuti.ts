// tests/e2e/aiuti.ts
//
// L'imbracatura delle prove da capo a fondo: lo stato del database, i giorni
// di prova, i due telefoni, il trascinamento e la rete trattenuta.
//
// Il database si prepara con gli stessi aiuti di Vitest (`tests/helpers`), e le
// «scritture della collega» passano dalle funzioni vere con la sessione vera di
// Annalisa: attraversano i trigger e producono gli annunci della diretta.
import type { Browser, BrowserContext, Locator, Page, Request, Route } from '@playwright/test'
import { oggiAPerugia } from '../../src/dominio/perugia'
import { giornoSettimana, sommaGiorni } from '../../src/dominio/tempo'
import { ALESSANDRA, ANNALISA, ANNALISA_AUTH, VERA, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { CLIENT_MARIA, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { preparaAccountLocali } from '../helpers/sessioni'

export { ALESSANDRA, ANNALISA, ANNALISA_AUTH, CLIENT_MARIA, SERVICE_MASSAGE, SERVICE_REFILL, VERA }
export { CLIENT_LUCIA } from '../helpers/fixtures'
export { VERA_AUTH } from '../helpers/db'

/** Dove `preparazione.ts` lascia gli accessi, uno per account. */
export const STATO_DI = {
  vera: 'tests/e2e/.auth/vera.json',
  annalisa: 'tests/e2e/.auth/annalisa.json',
} as const

/**
 * Gli orari di tutte e tre: da lunedì a sabato (weekday 0-5), 9:00-13:00 e
 * 14:00-19:00. Senza, ogni blocco è «fuori orario» e la prova 7 di §13.4 non
 * distingue niente.
 */
async function orari(): Promise<void> {
  await asOwner(async (c) => {
    for (const operatrice of [VERA, ANNALISA, ALESSANDRA]) {
      for (let weekday = 0; weekday <= 5; weekday++) {
        await c.query(
          `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
           values ($1, $2, 108, 156), ($1, $2, 168, 228)`,
          [operatrice, weekday],
        )
      }
    }
  })
}

/** Lo stato pulito di ogni prova: tabelle vuote, catalogo, due clienti, orari, password. */
export async function pulisci(): Promise<void> {
  // Il `truncate` di `resetData` può incrociare una richiesta della prova
  // precedente ancora in volo nel server (una rilettura, un invio tardivo):
  // misurato, un `40P01` su 54 prove. Sul solo deadlock si ritenta.
  for (let tentativo = 1; ; tentativo++) {
    try {
      await resetData()
      break
    } catch (e) {
      if ((e as { code?: string }).code !== '40P01' || tentativo === 3) throw e
    }
  }
  await seedFixture()
  await orari()
  await preparaAccountLocali()
}

/** «Oggi» a Perugia, quello del server (che gira su questa macchina). */
export const oggi = () => oggiAPerugia(new Date())

/**
 * Il giorno delle prove: il primo giorno lavorativo (lunedì-sabato) da
 * dopodomani in poi, con un giorno lavorativo anche DOPO di lui (lo
 * spostamento «a domani»). Futuro: il segno «fuori orario» vale oggi e dopo.
 */
export function giornoDiProva(): string {
  let g = sommaGiorni(oggi(), 2)
  while (giornoSettimana(g) >= 5) g = sommaGiorni(g, 1)
  return g
}

export const agenda = (data: string) => `/agenda?giorno=${data}`

let seq = 0
/** Un uuid valido e riconoscibile per le prove. */
export function uuid(prefisso: string): string {
  seq += 1
  return `${prefisso}-0000-4000-8000-${String(Date.now() % 1e6).padStart(6, '0')}${String(seq).padStart(6, '0')}`
}

export interface Appuntamento {
  readonly id: string
  readonly operatrice: string
  readonly servizio: string
  readonly inizio: number
  readonly durata: number
}

export interface Creata {
  readonly visita: string
  readonly appuntamenti: { id: string; versione: string }[]
}

/** Una visita scritta da Annalisa con `salva_visita`, come farebbe il suo telefono. */
export async function creaVisita(
  visitaId: string,
  data: string,
  appuntamenti: readonly Appuntamento[],
  cliente = CLIENT_MARIA,
): Promise<Creata> {
  return asOperatorCommit(ANNALISA_AUTH, async (c) => {
    const r = await c.query<{ r: { esito: string } & Creata }>(
      'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
      [crypto.randomUUID(), visitaId, cliente, data, JSON.stringify(appuntamenti)],
    )
    if (r.rows[0].r.esito !== 'salvata') throw new Error(`creaVisita: ${JSON.stringify(r.rows[0].r)}`)
    return r.rows[0].r
  })
}

export interface StatoLetto {
  readonly visita: string
  readonly data: string
  readonly cliente: string
  readonly appuntamenti: { id: string; versione: string; operatrice: string; servizio: string; inizio: number; durata: number }[]
}

/** La visita com'è nel database, letta da proprietario: è la misura, non passa dall'app. */
export async function leggiVisita(visitaId: string): Promise<StatoLetto | null> {
  return asOwner(async (c) => {
    const v = await c.query<{ versione: string; data: string; cliente: string }>(
      `select app.versione(updated_at) as versione, visit_date::text as data, client_id::text as cliente
         from visit where id = $1`,
      [visitaId],
    )
    if (v.rows.length === 0) return null
    const a = await c.query<{ id: string; versione: string; operatrice: string; servizio: string; inizio: number; durata: number }>(
      `select id::text, app.versione(updated_at) as versione, operator_id::text as operatrice,
              service_id::text as servizio, start_cell as inizio, cell_count as durata
         from appointment where visit_id = $1 order by id`,
      [visitaId],
    )
    return { visita: v.rows[0].versione, data: v.rows[0].data, cliente: v.rows[0].cliente, appuntamenti: a.rows }
  })
}

/** Quante visite ci sono in quel giorno, da proprietario. */
export async function visiteDel(data: string): Promise<number> {
  return asOwner(async (c) => {
    const r = await c.query<{ n: string }>('select count(*) as n from visit where visit_date = $1', [data])
    return Number(r.rows[0].n)
  })
}

/** Gli attesi di `p_attesi` (C3): proiettati su id e versione, in ordine d'id. */
export const attesi = (s: StatoLetto) => s.appuntamenti.map(({ id, versione }) => ({ id, versione }))

/** Annalisa riscrive la visita con `salva_visita`: l'insieme COMPLETO dei suoi appuntamenti. */
export async function riscriviVisita(visitaId: string, appuntamenti: readonly Appuntamento[]): Promise<string> {
  const s = await leggiVisita(visitaId)
  if (s === null) throw new Error('riscriviVisita: visita assente')
  return asOperatorCommit(ANNALISA_AUTH, async (c) => {
    const r = await c.query<{ r: { esito: string } }>('select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r', [
      crypto.randomUUID(),
      visitaId,
      s.cliente,
      s.data,
      JSON.stringify(appuntamenti),
      s.visita,
      JSON.stringify(attesi(s)),
    ])
    return r.rows[0].r.esito
  })
}

/** Annalisa cancella la visita con `cancella_visita`. */
export async function cancellaVisita(visitaId: string): Promise<string> {
  const s = await leggiVisita(visitaId)
  if (s === null) throw new Error('cancellaVisita: visita assente')
  return asOperatorCommit(ANNALISA_AUTH, async (c) => {
    const r = await c.query<{ r: { esito: string } }>('select cancella_visita($1,$2,$3,$4) as r', [
      crypto.randomUUID(),
      visitaId,
      s.visita,
      JSON.stringify(attesi(s)),
    ])
    return r.rows[0].r.esito
  })
}

/** Un telefono: un contesto del browser con l'accesso già fatto (`storageState`). */
export async function telefono(
  browser: Browser,
  chi: keyof typeof STATO_DI,
  /** Il telefono del progetto in corso: `test.info().project.use`. */
  uso: { viewport?: { width: number; height: number } | null; isMobile?: boolean; hasTouch?: boolean },
  extra: Parameters<Browser['newContext']>[0] = {},
): Promise<{ contesto: BrowserContext; pagina: Page }> {
  const contesto = await browser.newContext({
    baseURL: 'http://localhost:3000',
    locale: 'it-IT',
    viewport: uso.viewport ?? null,
    isMobile: uso.isMobile,
    hasTouch: uso.hasTouch,
    deviceScaleFactor: 3,
    storageState: STATO_DI[chi],
    ...extra,
  })
  return { contesto, pagina: await contesto.newPage() }
}

/** Il blocco di una visita nelle colonne (la lista ha gli stessi `data-visita`, ma è nascosta). */
export const blocco = (pagina: Page, visitaId: string): Locator =>
  pagina.getByRole('group', { name: 'Appuntamenti del giorno' }).locator(`article[data-visita="${visitaId}"]`)

/** La scheda aperta. */
export const scheda = (pagina: Page): Locator => pagina.getByRole('dialog')

/** L'agenda è idratata: la delega dei tocchi e il trascinamento rispondono. */
export async function apriAgenda(pagina: Page, data: string): Promise<void> {
  await pagina.goto(agenda(data))
  await pagina.getByRole('heading', { name: 'Agenda' }).waitFor()
  // Next idrata dopo il primo disegno: un tocco prima dell'idratazione si perde.
  await pagina.waitForFunction(() => document.readyState === 'complete')
  await pagina.waitForLoadState('networkidle')
}

/** Il tocco su uno spazio libero della colonna di un'operatrice, all'altezza di quella cella. */
export async function toccaSpazio(pagina: Page, operatriceId: string, cella: number): Promise<void> {
  const spazio = pagina.locator(`[data-colonna="${operatriceId}"]`)
  await spazio.scrollIntoViewIfNeeded()
  const da = Number(await spazio.getAttribute('data-da'))
  // Una cella sono 7 px (`grid-auto-rows: 7px`): il punto sta a metà della cella,
  // e la cella si porta dentro lo schermo prima del tocco.
  await spazio.click({ position: { x: 10, y: (cella - da) * 7 + 3.5 }, force: true })
}

/**
 * Il trascinamento con eventi di puntatore veri (Task 10): pressione di 0,4 s,
 * poi movimento verticale a piccoli passi, poi rilascio. `celle` da 5 minuti,
 * positive verso il basso.
 */
export async function trascina(pagina: Page, el: Locator, celle: number): Promise<void> {
  await el.scrollIntoViewIfNeeded()
  const r = (await el.boundingBox())!
  const x = r.x + r.width / 2
  const y = r.y + Math.min(10, r.height / 2)
  await pagina.mouse.move(x, y)
  await pagina.mouse.down()
  await pagina.waitForTimeout(600)
  const passi = Math.max(4, Math.abs(celle) * 2)
  for (let i = 1; i <= passi; i++) await pagina.mouse.move(x, y + (celle * 7 * i) / passi)
  await pagina.mouse.up()
}

/** Una Server Action: POST con l'intestazione `next-action`. «Controlla» è una rotta, e non la porta. */
export const eAzione = (r: Request) => r.method() === 'POST' && r.headers()['next-action'] !== undefined

/**
 * Trattiene NEL BROWSER la prossima Server Action, prima che parta: il gestore
 * della rotta aspetta e la lascia andare solo con `rilascia()`. Le altre
 * richieste passano.
 */
export async function trattieniLaProssimaAzione(pagina: Page) {
  let rilascia!: () => void
  const via = new Promise<void>((r) => (rilascia = r))
  let presa!: (r: Route) => void
  const trattenuta = new Promise<Route>((r) => (presa = r))
  let partita = false
  let una = false
  await pagina.route('**/*', async (route) => {
    if (una || !eAzione(route.request())) return route.fallback()
    una = true
    presa(route)
    await via
    partita = true
    await route.continue()
  })
  return {
    /** La richiesta è nelle mani del gestore, ferma. */
    trattenuta,
    rilascia,
    /** Vero solo dopo `rilascia()`: finché è falso, l'invio è ancora appeso. */
    partita: () => partita,
  }
}

/**
 * Salvataggio ARRIVATO, risposta PERSA: la prossima Server Action va al server
 * (che scrive), poi il browser la vede fallire come una rete caduta.
 */
export async function perdiLaRispostaDellaProssimaAzione(pagina: Page): Promise<{ arrivata: Promise<void> }> {
  let fatto!: () => void
  const arrivata = new Promise<void>((r) => (fatto = r))
  let una = false
  await pagina.route('**/*', async (route) => {
    if (una || !eAzione(route.request())) return route.fallback()
    una = true
    await route.fetch()
    fatto()
    await route.abort('connectionreset')
  })
  // Dentro un oggetto: una promessa restituita da una funzione `async` verrebbe
  // ASPETTATA da chi la chiama, prima ancora del tocco che la fa risolvere.
  return { arrivata }
}

/** L'id dell'unica visita di quel giorno, da proprietario. */
export async function laVisitaDel(data: string): Promise<string> {
  return asOwner(async (c) => {
    const r = await c.query<{ id: string }>('select id::text from visit where visit_date = $1', [data])
    if (r.rows.length !== 1) throw new Error(`laVisitaDel: ${r.rows.length} visite il ${data}`)
    return r.rows[0].id
  })
}
