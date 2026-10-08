// src/server/lettura-settimana.ts
//
// La settimana di un'operatrice (spec 3a §5.3): una sola lettura di
// `appointment`, filtrata sull'operatrice e sulle sette date. Non legge
// nessun nome, né di cliente né di servizio: la settimana mostra le sole ore
// d'inizio, e un dato che non si legge non può finire da nessuna parte.
//
// ⚠︎ I filtri sono su `appointment` (§4.8): `operator_id` e `appointment_date`
// non sono dati di una cliente.
import type { SupabaseClient } from '@supabase/supabase-js'
import { type AppuntamentoDiSettimana, type Settimana, componiSettimana, giorniDellaSettimana } from '../dominio/settimana'

export type { GiornoDiSettimana, Settimana } from '../dominio/settimana'

/** Una voce del selettore dell'operatrice: solo le attive (D2-2). */
export interface OperatriceAttiva {
  readonly id: string
  readonly nome: string
  readonly colore: string
}

interface RigaAppuntamento {
  id: string
  visit_id: string
  operator_id: string
  appointment_date: string
  start_cell: number
  cell_count: number
  service: { buffer_after_cells: number } | null
}

/**
 * Prende il client come argomento, come `leggiGiorno`. `lunedi` dev'essere un
 * lunedì vero: `giorniDellaSettimana` solleva prima di qualunque lettura.
 * Un errore di PostgREST solleva: un guasto non è una settimana vuota.
 */
export async function leggiSettimana(client: SupabaseClient, operatriceId: string, lunedi: string): Promise<Settimana> {
  const date = giorniDellaSettimana(lunedi)
  const lettura = await client
    .from('appointment')
    .select('id, visit_id, operator_id, appointment_date, start_cell, cell_count, service:service_id ( buffer_after_cells )')
    .eq('operator_id', operatriceId)
    .gte('appointment_date', date[0])
    .lte('appointment_date', date[6])
    .order('appointment_date')
    .order('start_cell')
  if (lettura.error !== null) throw new Error(`lettura di appointment fallita: ${lettura.error.code}`)

  const appuntamenti: AppuntamentoDiSettimana[] = (lettura.data as unknown as RigaAppuntamento[]).map((r) => {
    if (r.service === null) throw new Error(`appuntamento ${r.id} senza servizio leggibile`)
    return {
      id: r.id,
      visitaId: r.visit_id,
      operatriceId: r.operator_id,
      data: r.appointment_date,
      inizio: r.start_cell,
      durata: r.cell_count,
      pausa: r.service.buffer_after_cells,
    }
  })
  return componiSettimana(operatriceId, lunedi, appuntamenti)
}

/** Le operatrici attive, nell'ordine del salone: le voci del selettore. */
export async function leggiOperatriciAttive(client: SupabaseClient): Promise<OperatriceAttiva[]> {
  const r = await client
    .from('operator')
    .select('id, name, color')
    .eq('is_active', true)
    .eq('in_agenda', true)   // l'assistenza (0023) non si sceglie mai: né in agenda, né per un servizio
    .order('sort_order')
    .order('name')
  if (r.error !== null) throw new Error(`lettura di operator fallita: ${r.error.code}`)
  return (r.data as { id: string; name: string; color: string }[]).map((o) => ({ id: o.id, nome: o.name, colore: o.color }))
}
