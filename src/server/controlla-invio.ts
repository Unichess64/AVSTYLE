// src/server/controlla-invio.ts
//
// «Controlla» lato server (spec 3a §4.4, §4.3 passo 8; piano 3a-2 Task 9): la
// rotta `POST /api/controlla` chiama `public.controlla_invio` (0018) e
// restituisce `{riga, esito_invio, stato}` GREZZI. La decisione la prende il
// telefono con `decidiControlla`, perché deve confrontare con la scheda.
//
// ⚠︎ NON è una Server Action. Le Server Actions dello stesso telefono partono
// in FILA: «Controlla» come Server Action aspetterebbe dietro l'invio appeso,
// cioè dietro esattamente ciò che deve diagnosticare. Da qui la rotta, chiamata
// con `fetch`.
//
// ⚠︎ C2: l'involucro con il soggetto `'controlla'`. Un SQLSTATE di «Controlla»
// non prova niente sull'invio, che può ancora arrivare: §4.4 dà «Non so se è
// stata salvata», mai «non risulta», mai «riprova a salvare». La classe
// dell'involucro passa così com'è al telefono: la politica sta in
// `classifica`, non qui.
//
// Il corpo prende il client come argomento, come `rispostaScheda`: la rotta
// gli passa quello di `clientServer()`, le prove uno con il token.
import type { SupabaseClient } from '@supabase/supabase-js'
import { type RispostaControlla, leggiRispostaControlla } from '../dominio/controlla'
import { avvolgi } from './involucro'
import { NonAutenticata, NonOperatrice, operatriceCorrente } from './supabase'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: { 'Cache-Control': 'no-store' } })

/** Un errore di PostgREST ridotto al codice: mai `details` né `hint` (§4.9). */
class GuastoControlla extends Error {
  constructor(readonly code: string) {
    super(`controlla_invio fallita: ${code}`)
  }
}

async function chiamaControlla(client: SupabaseClient, codice: string, visitaId: string): Promise<RispostaControlla> {
  const r = await client.rpc('controlla_invio', { p_codice: codice, p_visita: visitaId })
  if (r.error !== null) throw new GuastoControlla(r.error.code)
  return leggiRispostaControlla(r.data)
}

export async function rispostaControlla(richiesta: Request, client: SupabaseClient): Promise<Response> {
  const id = crypto.randomUUID()
  if (!(richiesta.headers.get('content-type') ?? '').startsWith('application/json')) return json({ errore: 'formato' }, 415)
  let corpo: Record<string, unknown> | null
  try {
    corpo = (await richiesta.json()) as Record<string, unknown> | null
  } catch {
    return json({ errore: 'richiesta' }, 400)
  }
  const codice = corpo?.codice
  const visitaId = corpo?.visitaId
  if (typeof codice !== 'string' || !UUID.test(codice) || typeof visitaId !== 'string' || !UUID.test(visitaId)) {
    return json({ errore: 'richiesta' }, 400)
  }

  // §4.4: «ricontrollo dell'account prima di “Controlla”». Un account chiuso
  // esce senza affermazioni; un guasto dell'identità non dice niente, ed è
  // «Non so» — niente è stato bruciato.
  try {
    await operatriceCorrente(client)
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return json({ tipo: 'uscita_forzata' }, 401)
    console.error('controlla: identità non verificabile', { id })
    return json({ tipo: 'non_so' }, 503)
  }

  const esito = await avvolgi('controlla', id, () => chiamaControlla(client, codice, visitaId))
  if ('riga' in esito) return json({ tipo: 'riga', ...esito })
  if (esito.tipo === 'uscita_forzata') return json(esito, 401)
  return json(esito, 503)
}
