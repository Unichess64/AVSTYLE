// src/app/api/controlla/route.ts
//
// «Controlla» (spec 3a §4.4): una rotta in POST, FUORI dalla fila delle
// Server Actions, perché deve rispondere mentre un invio è ancora appeso.
// Tutto il resto è in `rispostaControlla`.
import { rispostaControlla } from '../../../server/controlla-invio'
import { clientServer } from '../../../server/supabase'

export async function POST(richiesta: Request): Promise<Response> {
  return rispostaControlla(richiesta, await clientServer())
}
