// src/server/lettura-disponibilita.ts — la settimana tipo di un'operatrice.
import type { SupabaseClient } from '@supabase/supabase-js'

/** Una fascia come coppia di confini [inizio, fine), in celle da 5 minuti. */
export type Coppia = [number, number]

/** Sette giorni, indice 0 = lunedì (come `weekly_availability.weekday`). */
export async function leggiSettimanaTipo(client: SupabaseClient, operatriceId: string): Promise<Coppia[][]> {
  const r = await client
    .from('weekly_availability')
    .select('weekday, start_boundary, end_boundary')
    .eq('operator_id', operatriceId)
    .order('weekday')
    .order('start_boundary')
  if (r.error !== null) throw new Error(`lettura di weekly_availability fallita: ${r.error.code}`)
  const settimana: Coppia[][] = [[], [], [], [], [], [], []]
  for (const f of r.data as { weekday: number; start_boundary: number; end_boundary: number }[]) {
    settimana[f.weekday]!.push([f.start_boundary, f.end_boundary])
  }
  return settimana
}
