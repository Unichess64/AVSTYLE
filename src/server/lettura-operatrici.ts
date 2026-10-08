// src/server/lettura-operatrici.ts — le operatrici con il loro account.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface RigaOperatrice {
  readonly id: string
  readonly nome: string
  readonly colore: string
  readonly attiva: boolean
  /** non collegata; collegata a un account; collegata a un account che non esiste più. */
  readonly stato: 'non_collegata' | 'collegata' | 'orfana'
  readonly email: string | null
  readonly io: boolean
  /** L'assistenza (0023): entra nell'app ma non compare in agenda. */
  readonly assistenza: boolean
}

export interface Account { readonly id: string; readonly email: string }

export async function leggiOperatrici(
  client: SupabaseClient,
  ioId: string,
): Promise<{ operatrici: RigaOperatrice[]; liberi: Account[] }> {
  const [o, a] = await Promise.all([
    client.from('operator').select('id, name, color, is_active, auth_user_id, in_agenda').order('sort_order').order('name'),
    client.rpc('list_auth_accounts'),
  ])
  if (o.error !== null) throw new Error(`lettura di operator fallita: ${o.error.code}`)
  if (a.error !== null) throw new Error(`lettura degli account fallita: ${a.error.code}`)
  const account = new Map((a.data as Account[]).map((x) => [x.id, x.email]))
  const righe = o.data as { id: string; name: string; color: string; is_active: boolean; auth_user_id: string | null; in_agenda: boolean }[]
  const collegati = new Set(righe.map((r) => r.auth_user_id).filter((x) => x !== null))
  return {
    operatrici: righe.map((r) => ({
      id: r.id,
      nome: r.name,
      colore: r.color,
      attiva: r.is_active,
      stato: r.auth_user_id === null ? 'non_collegata' : account.has(r.auth_user_id) ? 'collegata' : 'orfana',
      email: r.auth_user_id === null ? null : account.get(r.auth_user_id) ?? null,
      io: r.id === ioId,
      assistenza: !r.in_agenda,
    })),
    liberi: (a.data as Account[]).filter((x) => !collegati.has(x.id)),
  }
}
