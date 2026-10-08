'use server'
// src/server/azioni-disponibilita.ts — le scritture della schermata Disponibilità.
import { piega } from '../dominio/fasce'
import type { Coppia } from './lettura-disponibilita'
import { NonAutenticata, NonOperatrice, clientServer, operatriceCorrente } from './supabase'

export type EsitoDisponibilita =
  | { readonly ok: true }
  | { readonly ok: false; readonly testo: string; readonly uscita?: boolean }

const RIPROVA = 'Non sono riuscita a salvare, riprova'

function fasceValide(fasce: unknown): fasce is Coppia[] {
  return (
    Array.isArray(fasce) &&
    fasce.every(
      (f) =>
        Array.isArray(f) && f.length === 2 &&
        Number.isInteger(f[0]) && Number.isInteger(f[1]) &&
        f[0] >= 0 && f[1] <= 288 && f[0] < f[1],
    )
  )
}

/**
 * Sostituisce le fasce di un giorno della settimana tipo. Le fasce si PIEGANO
 * prima di scrivere: 9–13 più 12–15 sono 9–15, e il rifiuto 23P01 non nasce.
 */
export async function salvaGiornoSettimana(operatriceId: string, giorno: number, fasce: Coppia[]): Promise<EsitoDisponibilita> {
  if (typeof operatriceId !== 'string' || !Number.isInteger(giorno) || giorno < 0 || giorno > 6 || !fasceValide(fasce)) {
    return { ok: false, testo: 'Orario non valido: controlla le fasce' }
  }
  const piegate = piega(fasce.map(([s, e]) => ({ startBoundary: s, endBoundary: e }))).map(
    (f): Coppia => [f.startBoundary, f.endBoundary],
  )

  const client = await clientServer()
  try {
    await operatriceCorrente(client)
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) {
      return { ok: false, testo: 'La sessione è chiusa: rientra.', uscita: true }
    }
    throw e
  }

  const r = await client.rpc('scrivi_giorno_settimana', {
    p_operator_id: operatriceId,
    p_weekday: giorno,
    p_fasce: piegate,
  })
  if (r.error === null) return { ok: true }

  const id = crypto.randomUUID()
  console.error('disponibilita: scrittura fallita', { code: r.error.code ?? 'nessuno', id })
  if (r.error.code === '23P01') return { ok: false, testo: 'Due fasce si sovrappongono' }
  if (r.error.code === '42501') return { ok: false, testo: 'La sessione è chiusa: rientra.', uscita: true }
  return { ok: false, testo: RIPROVA }
}
