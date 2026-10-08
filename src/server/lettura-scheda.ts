// src/server/lettura-scheda.ts
//
// Le letture della scheda visita: lo stato della visita, il giorno su cui la
// scheda lavora, il catalogo, la ricerca delle clienti e i doppioni.
//
// ⚠︎ Passano da una ROTTA in POST (`src/app/api/scheda/route.ts`), non da una
// Server Action: le Server Actions dello stesso telefono si mettono in FILA
// (spec 3a §5.1, §4.4), e una ricerca fatta come Server Action aspetterebbe
// dietro un salvataggio appeso. In POST il testo cercato sta nel corpo, mai
// nell'indirizzo (§4.8).
//
// ⚠︎ `cerca_clienti` e `doppioni_cliente` (0021) si chiamano con `.rpc(…)` in
// POST e NIENTE dopo: un metodo-filtro concatenato finirebbe nella
// querystring, e la prova di §4.8 lo cerca.
//
// Un errore di PostgREST SOLLEVA: un guasto non è «nessuna cliente».
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Vicino } from '../dominio/avvisi'
import type { AppuntamentoLetto } from '../dominio/blocchi'
import type { Catalogo, ServizioDelCatalogo } from '../dominio/durate'
import type { GiornoRisolto } from '../dominio/finestra'
import { type StatoVisita, leggiStatoVisita } from '../dominio/stato-visita'
import { sommaGiorni } from '../dominio/tempo'
import { dataReale } from '../dominio/validazione'
import { leggiGiorno } from './lettura-giorno'
import { type OperatriceAttiva, leggiOperatriciAttive } from './lettura-settimana'
import { NonAutenticata, NonOperatrice, operatriceCorrente } from './supabase'

/** Un guasto di lettura che porta solo il codice: nei log va solo quello (§4.9). */
export class GuastoLettura extends Error {
  constructor(readonly code: string, dove: string) {
    super(`${dove} fallita: ${code}`)
  }
}

/** Il giorno come lo vuole la scheda, in una forma che attraversa JSON. */
export interface DatiGiorno {
  readonly data: string
  /** Le colonne del giorno, con le disattivate che hanno appuntamenti: servono i loro nomi. */
  readonly operatrici: readonly { readonly id: string; readonly nome: string; readonly attiva: boolean }[]
  readonly risolti: Readonly<Record<string, Pick<GiornoRisolto, 'ranges' | 'dayStatus'>>>
  readonly appuntamenti: readonly AppuntamentoLetto[]
}

export interface ClienteTrovata {
  readonly id: string
  readonly nome: string
  readonly telefono: string | null
}

export interface Doppione extends ClienteTrovata {
  readonly motivo: 'telefono' | 'nome'
}

export interface RispostaApri {
  readonly stato: StatoVisita | null
  /** Solo le attive: l'elenco della scheda (D2-2). */
  readonly attive: readonly OperatriceAttiva[]
  readonly catalogo: Catalogo
  readonly giorno: DatiGiorno
  /** Il nome della cliente della visita, se la visita c'è. */
  readonly clienteNome: string | null
}

export type RichiestaScheda =
  | { readonly tipo: 'apri'; readonly data: string; readonly visitaId: string | null }
  | { readonly tipo: 'giorno'; readonly data: string }
  | { readonly tipo: 'cerca'; readonly testo: string }
  | { readonly tipo: 'doppioni'; readonly nome: string; readonly telefono: string | null }
  | { readonly tipo: 'vicini'; readonly clienteId: string; readonly data: string }
  | { readonly tipo: 'cliente'; readonly id: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** Un nome o un testo cercato non sono più lunghi di così: oltre è un corpo storto. */
const LUNGHEZZA_MASSIMA = 120

function data(x: unknown): string | null {
  if (typeof x !== 'string') return null
  try {
    return dataReale(x)
  } catch {
    return null
  }
}

const corto = (x: unknown): x is string => typeof x === 'string' && x.length <= LUNGHEZZA_MASSIMA

/** Il corpo della richiesta, controllato: `null` se è storto. */
export function leggiRichiesta(corpo: unknown): RichiestaScheda | null {
  if (typeof corpo !== 'object' || corpo === null) return null
  const c = corpo as Record<string, unknown>
  switch (c.tipo) {
    case 'apri': {
      const d = data(c.data)
      const v = c.visitaId === null ? null : typeof c.visitaId === 'string' && UUID.test(c.visitaId) ? c.visitaId : undefined
      return d === null || v === undefined ? null : { tipo: 'apri', data: d, visitaId: v }
    }
    case 'giorno': {
      const d = data(c.data)
      return d === null ? null : { tipo: 'giorno', data: d }
    }
    case 'vicini': {
      const d = data(c.data)
      return d === null || typeof c.clienteId !== 'string' || !UUID.test(c.clienteId) ? null : { tipo: 'vicini', clienteId: c.clienteId, data: d }
    }
    case 'cliente':
      return typeof c.id === 'string' && UUID.test(c.id) ? { tipo: 'cliente', id: c.id } : null
    case 'cerca':
      return corto(c.testo) ? { tipo: 'cerca', testo: c.testo } : null
    case 'doppioni':
      return corto(c.nome) && (c.telefono === null || corto(c.telefono))
        ? { tipo: 'doppioni', nome: c.nome, telefono: c.telefono as string | null }
        : null
    default:
      return null
  }
}

export async function leggiStato(client: SupabaseClient, visitaId: string): Promise<StatoVisita | null> {
  const r = await client.rpc('stato_visita', { p_visita: visitaId })
  if (r.error !== null) throw new GuastoLettura(r.error.code, 'stato_visita')
  return leggiStatoVisita(r.data)
}

interface RigaServizio {
  id: string
  name: string
  default_duration_cells: number
  buffer_after_cells: number
  is_active: boolean
  sort_order: number
  category: { name: string; sort_order: number } | null
}

/** Il catalogo non è un dato di una cliente: un `select` normale. */
export async function leggiCatalogo(client: SupabaseClient): Promise<Catalogo> {
  const [servizi, perOperatrice] = await Promise.all([
    client
      .from('service')
      .select('id, name, default_duration_cells, buffer_after_cells, is_active, sort_order, category:category_id ( name, sort_order )'),
    client.from('operator_service').select('operator_id, service_id, duration_cells'),
  ])
  if (servizi.error !== null) throw new GuastoLettura(servizi.error.code, 'lettura di service')
  if (perOperatrice.error !== null) throw new GuastoLettura(perOperatrice.error.code, 'lettura di operator_service')
  const righe = servizi.data as unknown as RigaServizio[]
  const ordinate = [...righe].sort(
    (x, y) =>
      (x.category?.sort_order ?? 0) - (y.category?.sort_order ?? 0) ||
      (x.category?.name ?? '').localeCompare(y.category?.name ?? '', 'it') ||
      x.sort_order - y.sort_order ||
      x.name.localeCompare(y.name, 'it'),
  )
  return {
    servizi: ordinate.map(
      (s): ServizioDelCatalogo => ({
        id: s.id,
        nome: s.name,
        categoria: s.category?.name ?? '',
        durata: s.default_duration_cells,
        pausa: s.buffer_after_cells,
        attivo: s.is_active,
      }),
    ),
    durateOperatrice: (perOperatrice.data as { operator_id: string; service_id: string; duration_cells: number | null }[]).map(
      (r) => ({ operatriceId: r.operator_id, servizioId: r.service_id, durata: r.duration_cells }),
    ),
  }
}

export async function leggiDatiGiorno(client: SupabaseClient, giorno: string, io: string): Promise<DatiGiorno> {
  const g = await leggiGiorno(client, giorno, io)
  const risolti: Record<string, Pick<GiornoRisolto, 'ranges' | 'dayStatus'>> = {}
  for (const [id, r] of g.risolti) risolti[id] = { ranges: r.ranges, dayStatus: r.dayStatus }
  return {
    data: g.data,
    operatrici: g.operatrici.map((o) => ({ id: o.id, nome: o.nome, attiva: o.attiva })),
    risolti,
    appuntamenti: g.appuntamenti,
  }
}

export async function cercaClienti(client: SupabaseClient, testo: string): Promise<ClienteTrovata[]> {
  // Testo vuoto: la funzione restituisce zero righe da sé (0021); non la si
  // chiama nemmeno.
  if (testo.trim() === '') return []
  const r = await client.rpc('cerca_clienti', { p_testo: testo })
  if (r.error !== null) throw new GuastoLettura(r.error.code, 'cerca_clienti')
  return (r.data as { id: string; full_name: string; phone: string | null }[]).map((c) => ({
    id: c.id,
    nome: c.full_name,
    telefono: c.phone,
  }))
}

export async function doppioniCliente(client: SupabaseClient, nome: string, telefono: string | null): Promise<Doppione[]> {
  if (nome.trim() === '' && (telefono === null || telefono.trim() === '')) return []
  const r = await client.rpc('doppioni_cliente', { p_nome: nome.trim() === '' ? null : nome, p_telefono: telefono })
  if (r.error !== null) throw new GuastoLettura(r.error.code, 'doppioni_cliente')
  // `union` toglie i doppi di riga, non di cliente: una che corrisponde per
  // telefono E per nome torna due volte. Vince il telefono, che è più forte.
  const perId = new Map<string, Doppione>()
  for (const c of r.data as { id: string; full_name: string; phone: string | null; motivo: 'telefono' | 'nome' }[]) {
    if (perId.get(c.id)?.motivo === 'telefono') continue
    perId.set(c.id, { id: c.id, nome: c.full_name, telefono: c.phone, motivo: c.motivo })
  }
  return [...perId.values()].sort((x, y) => (x.motivo === y.motivo ? x.nome.localeCompare(y.nome, 'it') : x.motivo === 'telefono' ? -1 : 1))
}

/** La risposta a una richiesta già controllata. `io` è l'`operator.id` dell'account. */
export async function rispondi(client: SupabaseClient, r: RichiestaScheda, io: string): Promise<unknown> {
  switch (r.tipo) {
    case 'apri': {
      const stato = r.visitaId === null ? null : await leggiStato(client, r.visitaId)
      const [attive, catalogo, giorno] = await Promise.all([
        leggiOperatriciAttive(client),
        leggiCatalogo(client),
        leggiDatiGiorno(client, stato?.data ?? r.data, io),
      ])
      const clienteNome =
        stato === null ? null : (giorno.appuntamenti.find((a) => a.visitaId === r.visitaId)?.clienteNome ?? null)
      return { stato, attive, catalogo, giorno, clienteNome } satisfies RispostaApri
    }
    case 'giorno':
      return leggiDatiGiorno(client, r.data, io)
    case 'cerca':
      return cercaClienti(client, r.testo)
    case 'doppioni':
      return doppioniCliente(client, r.nome, r.telefono)
    case 'vicini':
      return leggiVicini(client, r.clienteId, r.data)
    case 'cliente':
      return leggiSchedaCliente(client, r.id)
  }
}

export interface AppuntamentoDellaCliente {
  readonly data: string
  readonly inizio: number
  readonly servizio: string
  readonly operatrice: string
}
export interface SchedaCliente extends ClienteTrovata {
  readonly appuntamenti: readonly AppuntamentoDellaCliente[]
}

/** La scheda di una cliente: i dati e tutti i suoi appuntamenti, dal più recente. `null` se non c'è più. */
export async function leggiSchedaCliente(client: SupabaseClient, id: string): Promise<SchedaCliente | null> {
  const [c, a] = await Promise.all([
    client.from('client').select('id, full_name, phone').eq('id', id).maybeSingle(),
    client
      .from('appointment')
      .select('appointment_date, start_cell, service:service_id ( name ), operator:operator_id ( name ), visit:visit!appointment_visit_date_fk!inner ( client_id )')
      .eq('visit.client_id', id)
      .order('appointment_date', { ascending: false })
      .order('start_cell'),
  ])
  if (c.error !== null) throw new GuastoLettura(c.error.code, 'client')
  if (a.error !== null) throw new GuastoLettura(a.error.code, 'appointment')
  if (c.data === null) return null
  const riga = c.data as { id: string; full_name: string; phone: string | null }
  return {
    id: riga.id,
    nome: riga.full_name,
    telefono: riga.phone,
    appuntamenti: (
      a.data as unknown as { appointment_date: string; start_cell: number; service: { name: string } | null; operator: { name: string } | null }[]
    ).map((x) => ({
      data: x.appointment_date,
      inizio: x.start_cell,
      servizio: x.service?.name ?? 'Servizio',
      operatrice: x.operator?.name ?? '',
    })),
  }
}

/**
 * Gli appuntamenti della cliente nella settimana prima e in quella dopo `data`.
 * Il filtro è sull'id della cliente, che non è un dato personale: nessun nome
 * viaggia nell'indirizzo (§4.8).
 */
export async function leggiVicini(client: SupabaseClient, clienteId: string, giorno: string): Promise<Vicino[]> {
  const r = await client
    .from('appointment')
    .select('appointment_date, service_id, visit_id, visit:visit!appointment_visit_date_fk!inner ( client_id )')
    .eq('visit.client_id', clienteId)
    .gte('appointment_date', sommaGiorni(giorno, -7))
    .lte('appointment_date', sommaGiorni(giorno, 7))
  if (r.error !== null) throw new GuastoLettura(r.error.code, 'appointment')
  return (r.data as { appointment_date: string; service_id: string; visit_id: string }[]).map((a) => ({
    data: a.appointment_date,
    servizioId: a.service_id,
    visitaId: a.visit_id,
  }))
}

/** Il codice di un guasto, e solo quello: mai `details`, `hint` né il messaggio (§4.9). */
function codiceDi(e: unknown): string {
  if (e instanceof GuastoLettura) return e.code
  const c = (e as { code?: unknown } | null)?.code
  return typeof c === 'string' ? c : 'sconosciuto'
}

const json = (corpo: unknown, status = 200) =>
  Response.json(corpo, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * La rotta intera, con il client come argomento: la rotta le passa quello di
 * `clientServer()`, le prove uno con il token.
 *
 *   — identità con `operatriceCorrente`, cioè `getUser()` (§4.2): 401 per chi
 *     non ha una sessione o non è un'operatrice attiva, che il telefono tratta
 *     come l'uscita forzata;
 *   — solo `application/json`: un modulo di un altro sito non arriva qui;
 *   — un guasto è un 503, mai una risposta vuota, e nel log solo `code` e
 *     `id` — mai il testo cercato (§4.9).
 */
export async function rispostaScheda(richiesta: Request, client: SupabaseClient): Promise<Response> {
  const id = crypto.randomUUID()
  if (!(richiesta.headers.get('content-type') ?? '').startsWith('application/json')) return json({ errore: 'formato' }, 415)
  let corpo: unknown
  try {
    corpo = await richiesta.json()
  } catch {
    return json({ errore: 'richiesta' }, 400)
  }
  const r = leggiRichiesta(corpo)
  if (r === null) return json({ errore: 'richiesta' }, 400)

  let io: string
  try {
    io = (await operatriceCorrente(client)).operatorId
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return json({ errore: 'uscita' }, 401)
    console.error('scheda: identità non verificabile', { id })
    return json({ errore: 'guasto', id }, 503)
  }

  try {
    return json(await rispondi(client, r, io))
  } catch (e) {
    console.error('scheda: lettura fallita', { code: codiceDi(e), id })
    return json({ errore: 'guasto', id }, 503)
  }
}
