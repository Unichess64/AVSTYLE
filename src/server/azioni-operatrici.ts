'use server'
// src/server/azioni-operatrici.ts — aggiunta, colore, ordine, collegamento, attivazione, sessioni.
import { type EsitoScrittura, scrivi } from './scrittura-semplice'

/** Sette tinte chiare (D3c-9, D3c-11): il bordo d'inchiostro lo mette il disegno del blocco. */
const TAVOLOZZA = new Set(['#F3A4BA', '#FFFFFF', '#FFD8B0', '#FCE38A', '#D7C4EC', '#BFE3F0', '#C9E7D6'])

const GUARDIA = { '23514:': 'Resterebbe il salone senza nessuna operatrice che può entrare' }
const nomeValido = (n: unknown): n is string => typeof n === 'string' && n.trim().length > 0 && n.trim().length <= 40

export async function aggiungiOperatrice(nome: string, colore: string): Promise<EsitoScrittura> {
  if (!nomeValido(nome)) return { ok: false, testo: 'Scrivi il nome' }
  if (!TAVOLOZZA.has(colore)) return { ok: false, testo: 'Scegli un colore' }
  return scrivi(async (c) => {
    const ultima = await c.from('operator').select('sort_order').order('sort_order', { ascending: false }).limit(1)
    const posto = ((ultima.data as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1
    return c.from('operator').insert({ name: nome.trim(), color: colore, sort_order: posto })
  })
}

export async function cambiaColore(id: string, colore: string): Promise<EsitoScrittura> {
  if (!TAVOLOZZA.has(colore)) return { ok: false, testo: 'Scegli un colore della tavolozza' }
  return scrivi((c) => c.from('operator').update({ color: colore }).eq('id', id))
}

/** Scambia il posto con la vicina sopra (-1) o sotto (+1). Riscrive l'ordine di tutte, da 1 in su. */
export async function sposta(id: string, verso: -1 | 1): Promise<EsitoScrittura> {
  return scrivi(async (c) => {
    const r = await c.from('operator').select('id').order('sort_order').order('name')
    if (r.error !== null) return r
    const ids = (r.data as { id: string }[]).map((x) => x.id)
    const i = ids.indexOf(id)
    const j = i + verso
    if (i < 0 || j < 0 || j >= ids.length) return { error: null }
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
    for (const [posto, x] of ids.entries()) {
      const u = await c.from('operator').update({ sort_order: posto + 1 }).eq('id', x)
      if (u.error !== null) return u
    }
    return { error: null }
  })
}

export async function collega(id: string, authUserId: string): Promise<EsitoScrittura> {
  return scrivi((c) => c.from('operator').update({ auth_user_id: authUserId }).eq('id', id), {
    ...GUARDIA,
    operator_auth_user_id_key: 'Questo account è già collegato a un’altra operatrice',
  })
}

export async function scollega(id: string): Promise<EsitoScrittura> {
  return scrivi((c) => c.from('operator').update({ auth_user_id: null }).eq('id', id), GUARDIA)
}

/** Disattivare chiude subito le sessioni dell'operatrice; riattivarla anche (0015). */
export async function attiva(id: string, attiva: boolean): Promise<EsitoScrittura> {
  return scrivi((c) => c.from('operator').update({ is_active: attiva }).eq('id', id), GUARDIA)
}

export async function chiudiSessioni(id: string): Promise<EsitoScrittura> {
  return scrivi((c) => c.rpc('chiudi_sessioni', { p_operator_id: id }), {
    P0004: 'Non ho potuto: ricarica e riprova.',
  })
}
