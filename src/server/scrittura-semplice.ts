// src/server/scrittura-semplice.ts — identità, scrittura, traduzione dell'errore.
// Per le schermate di Impostazioni e Operatrici. NON è un file 'use server': da
// lì ogni funzione esportata diventerebbe un'azione chiamabile dal browser.
import { NonAutenticata, NonOperatrice, clientServer, operatriceCorrente, type Operatrice } from './supabase'

export type EsitoScrittura =
  | { readonly ok: true; readonly quante?: number }
  | { readonly ok: false; readonly testo: string; readonly uscita?: boolean }

export const RIPROVA = 'Non sono riuscita a salvare, riprova'
export const USCITA: EsitoScrittura = { ok: false, testo: 'La sessione è chiusa: rientra.', uscita: true }

export type Client = Awaited<ReturnType<typeof clientServer>>
type Risposta = { data?: unknown; error: { code?: string; message: string } | null }

/**
 * `frasi` dà la frase per nome di vincolo o per codice; la chiave `''` vale per
 * un errore SENZA nome di vincolo (la guardia delle operatrici ne è un esempio).
 * Un 40P01 (stallo, atteso su `operator`) si ritenta una volta: annulla sempre
 * la transazione, quindi ripetere è sicuro.
 */
export async function scrivi(
  scrittura: (c: Client, io: Operatrice) => PromiseLike<Risposta>,
  frasi: Record<string, string> = {},
): Promise<EsitoScrittura> {
  const client = await clientServer()
  let io: Operatrice
  try {
    io = await operatriceCorrente(client)
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return USCITA
    throw e
  }
  let r = await scrittura(client, io)
  if (r.error?.code === '40P01') r = await scrittura(client, io)
  if (r.error === null) return { ok: true, quante: typeof r.data === 'number' ? r.data : undefined }
  const codice = r.error.code ?? 'nessuno'
  console.error('scrittura: fallita', { code: codice, id: crypto.randomUUID() })
  if (codice === '42501') return USCITA
  const vincolo = /constraint "([^"]+)"/.exec(r.error.message)?.[1]
  const frase = vincolo !== undefined ? frasi[vincolo] : frasi[`${codice}:`]
  return { ok: false, testo: frase ?? frasi[codice] ?? RIPROVA }
}
