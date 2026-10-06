// src/app/api/scheda/route.ts
//
// Le letture della scheda visita, in POST e FUORI dalla fila delle Server
// Actions (spec 3a §4.4, §5.1): una ricerca non deve aspettare dietro un
// salvataggio appeso, e il testo cercato sta nel corpo, mai nell'indirizzo
// (§4.8). Tutto il resto è in `rispostaScheda`.
import { rispostaScheda } from '../../../server/lettura-scheda'
import { clientServer } from '../../../server/supabase'

export async function POST(richiesta: Request): Promise<Response> {
  return rispostaScheda(richiesta, await clientServer())
}
