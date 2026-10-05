// src/app/(salone)/azioni.ts
'use server'

import { redirect } from 'next/navigation'
import { clientServer } from '../../server/supabase'

/**
 * «Esci» chiude SOLO questo telefono (§3.1). Le sessioni degli altri
 * dispositivi della stessa operatrice restano; quelle di una collega le chiude
 * il pulsante del 3c su `public.chiudi_sessioni`.
 */
export async function esci(): Promise<void> {
  const client = await clientServer()
  await client.auth.signOut({ scope: 'local' })
  redirect('/accesso')
}
