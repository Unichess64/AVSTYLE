// src/app/accesso/azioni.ts
'use server'

import { redirect } from 'next/navigation'
import { NonAutenticata, NonOperatrice, clientServer, operatriceCorrente } from '../../server/supabase'

export interface StatoAccesso {
  readonly errore: string | null
}

// Decise dall'utente il 05/10/2026. La seconda deve dire a un'operatrice
// DISATTIVATA che è disattivata: la prova di Playwright del Task 12 la cerca.
// Non si esportano: un file `use server` esporta solo funzioni asincrone.
const CREDENZIALI_SBAGLIATE = 'Email o password non corretti.'
const ACCOUNT_NON_ATTIVO = 'Questo account non è attivo. Chiedi a chi gestisce il salone.'
const SERVIZIO_GIU = 'Il servizio non risponde. Riprova tra qualche istante.'

export async function entra(_prima: StatoAccesso, dati: FormData): Promise<StatoAccesso> {
  const email = String(dati.get('email') ?? '').trim()
  const password = String(dati.get('password') ?? '')
  const client = await clientServer()

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error !== null) {
    // Solo un 400 di GoTrue dice «credenziali sbagliate»: un guasto o un 429
    // non devono far credere a chi entra di aver sbagliato la password.
    return { errore: error.status === 400 ? CREDENZIALI_SBAGLIATE : SERVIZIO_GIU }
  }

  try {
    await operatriceCorrente(client)
  } catch (e) {
    // In tutti e due i casi la sessione appena aperta non resta nel telefono:
    // chi non ha passato il controllo non deve avere cookie validi, nemmeno
    // per un guasto (revisione del Task 3). `local`: solo questa (§3.1).
    await client.auth.signOut({ scope: 'local' })
    if (!(e instanceof NonOperatrice || e instanceof NonAutenticata)) return { errore: SERVIZIO_GIU }
    return { errore: ACCOUNT_NON_ATTIVO }
  }

  // Fuori dal try: `redirect` lancia, e il catch lo inghiottirebbe.
  redirect('/agenda')
}
