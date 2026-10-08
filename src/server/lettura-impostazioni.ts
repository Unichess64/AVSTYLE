// src/server/lettura-impostazioni.ts — ciò che la schermata Impostazioni mostra.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Categoria { readonly id: string; readonly nome: string }
export interface Servizio {
  readonly id: string
  readonly nome: string
  readonly categoriaId: string
  readonly durata: number   // celle da 5 minuti
  readonly pausa: number    // celle da 5 minuti
  readonly attivo: boolean
  readonly esecutrici: readonly string[]   // operator.id
}
export interface DatiImpostazioni {
  readonly orario: { readonly inizio: number; readonly fine: number }
  readonly categorie: readonly Categoria[]
  readonly servizi: readonly Servizio[]
}

function esigi<T>(r: { data: T | null; error: { code?: string } | null }, cosa: string): T {
  if (r.error !== null) throw new Error(`lettura di ${cosa} fallita: ${r.error.code}`)
  return r.data as T
}

export async function leggiImpostazioni(client: SupabaseClient): Promise<DatiImpostazioni> {
  const [orario, categorie, servizi, abbinamenti] = await Promise.all([
    client.from('salon_settings').select('day_start_boundary, day_end_boundary').single(),
    client.from('service_category').select('id, name').order('sort_order').order('name'),
    client
      .from('service')
      .select('id, name, category_id, default_duration_cells, buffer_after_cells, is_active')
      .order('sort_order')
      .order('name'),
    client.from('operator_service').select('operator_id, service_id'),
  ])
  const o = esigi(orario, 'salon_settings') as { day_start_boundary: number; day_end_boundary: number }
  const chi = new Map<string, string[]>()
  for (const a of esigi(abbinamenti, 'operator_service') as { operator_id: string; service_id: string }[]) {
    chi.set(a.service_id, [...(chi.get(a.service_id) ?? []), a.operator_id])
  }
  return {
    orario: { inizio: o.day_start_boundary, fine: o.day_end_boundary },
    categorie: (esigi(categorie, 'service_category') as { id: string; name: string }[]).map((c) => ({ id: c.id, nome: c.name })),
    servizi: (
      esigi(servizi, 'service') as {
        id: string; name: string; category_id: string
        default_duration_cells: number; buffer_after_cells: number; is_active: boolean
      }[]
    ).map((s) => ({
      id: s.id,
      nome: s.name,
      categoriaId: s.category_id,
      durata: s.default_duration_cells,
      pausa: s.buffer_after_cells,
      attivo: s.is_active,
      esecutrici: chi.get(s.id) ?? [],
    })),
  }
}
