// src/server/lettura-doppi.ts — gli appuntamenti delle prossime due settimane, con
// cliente e servizio, per `doppiDaControllare`. I nomi stanno nella risposta, mai
// nell'indirizzo: i filtri sono solo sulle date (§4.8).
import type { SupabaseClient } from '@supabase/supabase-js'
import { type Doppio, doppiDaControllare } from '../dominio/doppi'
import { sommaGiorni } from '../dominio/tempo'

interface Riga {
  appointment_date: string
  service_id: string
  service: { name: string } | null
  visit: { client_id: string; client: { full_name: string } | null } | null
}

export async function leggiDoppi(client: SupabaseClient, oggi: string): Promise<Doppio[]> {
  const r = await client
    .from('appointment')
    .select('appointment_date, service_id, service:service_id ( name ), visit:visit!appointment_visit_date_fk ( client_id, client:client_id ( full_name ) )')
    .gte('appointment_date', oggi)
    .lte('appointment_date', sommaGiorni(oggi, 14))
  if (r.error !== null) throw new Error(`lettura degli appuntamenti fallita: ${r.error.code}`)
  return doppiDaControllare(
    (r.data as unknown as Riga[]).flatMap((a) =>
      a.visit === null || a.service === null
        ? []
        : [{
            data: a.appointment_date,
            clienteId: a.visit.client_id,
            clienteNome: a.visit.client?.full_name ?? 'Una cliente',
            servizioId: a.service_id,
            servizioNome: a.service.name,
          }],
    ),
    oggi,
  )
}
