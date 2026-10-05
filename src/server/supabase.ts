// src/server/supabase.ts
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { confermataDaGoTrue } from './gotrue'

// service_role NON sta qui e non sta nell'ambiente (§4.2). Solo la chiave
// anonima, che senza un JWT valido non legge niente: la sicurezza per riga fa
// il resto.
export async function clientServer(): Promise<SupabaseClient> {
  const deposito = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => deposito.getAll(),
        setAll: (nuovi) => {
          // ⚠︎ Dentro un Server Component `cookies().set` lancia: lì i cookie
          // li scrive solo il middleware, che ha già rinnovato la sessione
          // prima del rendering. Nelle Server Actions la scrittura riesce.
          try {
            for (const { name, value, options } of nuovi) deposito.set(name, value, options)
          } catch {
            // Server Component: niente da scrivere qui.
          }
        },
      },
    },
  )
}

export class NonAutenticata extends Error {}
export class NonOperatrice extends Error {}

export interface Operatrice {
  readonly authUserId: string
  readonly operatorId: string
  readonly nome: string
  readonly colore: string
}

/**
 * §4.2: `getUser()`, e mai le due letture che si fidano del cookie.
 *
 * `getUser()` interroga GoTrue e vede una sessione revocata; le altre due no.
 * Con D3-17 le sessioni si chiudono SUBITO quando un'operatrice viene
 * disattivata: una lettura che non vedesse la revoca renderebbe D3-17
 * decorativa. (I due nomi non si scrivono nemmeno qui: una prova statica li
 * cerca sotto `src/`.)
 *
 * La seconda lettura — la riga `operator` — non è ridondante: dice se questo
 * account è un'operatrice ATTIVA, e la sicurezza per riga la rende vuota per
 * chiunque non lo sia.
 *
 * Prende il client come argomento: le prove gli passano un client con il
 * token, il guscio e le Server Actions quello di `clientServer()`.
 */
export async function operatriceCorrente(client: SupabaseClient): Promise<Operatrice> {
  const { data: utente, error } = await client.auth.getUser()
  if (error !== null) {
    // La stessa regola del middleware (§4.7): un 4xx di GoTrue è una risposta
    // CONFERMATA, tutto il resto (429 compreso) è un guasto e non dice niente
    // dell'account.
    if (confermataDaGoTrue(error)) throw new NonAutenticata()
    throw new Error(`identità non verificabile: ${error.message}`)
  }
  if (utente.user === null) throw new NonAutenticata()

  // ⚠︎ La colonna è `name`: `operator` (0001_access_control.sql:15) non ha un
  // `full_name`, che è di `client`.
  const { data: riga, error: errore } = await client
    .from('operator')
    .select('id, name, color')
    .eq('auth_user_id', utente.user.id)
    .maybeSingle()
  // PostgREST irraggiungibile ≠ zero righe: senza questa riga un guasto
  // diventerebbe «questo account non è attivo».
  if (errore !== null) throw new Error(`lettura di operator fallita: ${errore.message}`)
  if (riga === null) throw new NonOperatrice()

  return { authUserId: utente.user.id, operatorId: riga.id, nome: riga.name, colore: riga.color }
}
