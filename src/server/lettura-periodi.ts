// src/server/lettura-periodi.ts — assenze e chiusure future, e gli appuntamenti di un periodo.
// I filtri sono su operatrice e date, mai su dati delle clienti (§4.8): nomi e
// telefoni arrivano nella risposta, per chi deve chiamare.
import type { SupabaseClient } from '@supabase/supabase-js'
import { type AppuntamentoColpito, type Coppia, type Periodo, raggruppaAssenze } from '../dominio/periodi'

export async function leggiAssenze(client: SupabaseClient, operatriceId: string, oggi: string): Promise<Periodo[]> {
  const r = await client
    .from('exception_day')
    .select('exception_date, exception_range ( start_boundary, end_boundary )')
    .eq('operator_id', operatriceId)
    .gte('exception_date', oggi)
    .order('exception_date')
  if (r.error !== null) throw new Error(`lettura delle assenze fallita: ${r.error.code}`)
  return raggruppaAssenze(
    (r.data as { exception_date: string; exception_range: { start_boundary: number; end_boundary: number }[] }[]).map((d) => ({
      data: d.exception_date,
      fasce: d.exception_range
        .map((f): Coppia => [f.start_boundary, f.end_boundary])
        .sort((x, y) => x[0] - y[0]),
    })),
  )
}

export interface Chiusura {
  readonly id: string
  readonly dal: string
  readonly al: string
  readonly da: number | null
  readonly a: number | null
  readonly motivo: string
}

export async function leggiChiusure(client: SupabaseClient, oggi: string): Promise<Chiusura[]> {
  const r = await client
    .from('salon_closure')
    .select('id, start_date, end_date, from_boundary, to_boundary, reason')
    .gte('end_date', oggi)
    .order('start_date')
  if (r.error !== null) throw new Error(`lettura delle chiusure fallita: ${r.error.code}`)
  return (
    r.data as { id: string; start_date: string; end_date: string; from_boundary: number | null; to_boundary: number | null; reason: string }[]
  ).map((c) => ({ id: c.id, dal: c.start_date, al: c.end_date, da: c.from_boundary, a: c.to_boundary, motivo: c.reason }))
}

interface Riga {
  appointment_date: string
  start_cell: number
  cell_count: number
  operator_id: string
  operator: { name: string } | null
  service: { name: string } | null
  visit: { client: { full_name: string; phone: string | null } | null } | null
}

/** Gli appuntamenti fra `dal` e `al`, di un'operatrice o di tutte (`null`). */
export async function appuntamentiNelPeriodo(
  client: SupabaseClient,
  dal: string,
  al: string,
  operatriceId: string | null,
): Promise<AppuntamentoColpito[]> {
  let q = client
    .from('appointment')
    .select('appointment_date, start_cell, cell_count, operator_id, operator:operator_id ( name ), service:service_id ( name ), visit:visit!appointment_visit_date_fk ( client:client_id ( full_name, phone ) )')
    .gte('appointment_date', dal)
    .lte('appointment_date', al)
  if (operatriceId !== null) q = q.eq('operator_id', operatriceId)
  const r = await q.order('appointment_date').order('start_cell')
  if (r.error !== null) throw new Error(`lettura degli appuntamenti fallita: ${r.error.code}`)
  return (r.data as unknown as Riga[]).map((a) => ({
    data: a.appointment_date,
    inizio: a.start_cell,
    durata: a.cell_count,
    operatriceId: a.operator_id,
    operatrice: a.operator?.name ?? '',
    servizio: a.service?.name ?? 'Servizio',
    cliente: a.visit?.client?.full_name ?? 'Una cliente',
    telefono: a.visit?.client?.phone ?? null,
  }))
}
