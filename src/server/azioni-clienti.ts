'use server'
// src/server/azioni-clienti.ts — la modifica di una cliente: nome e telefono.
import { telefonoE164 } from '../dominio/validazione'
import { type EsitoScrittura, scrivi } from './scrittura-semplice'

export async function aggiornaCliente(id: string, nome: string, telefono: string): Promise<EsitoScrittura> {
  if (typeof nome !== 'string' || nome.trim() === '' || nome.trim().length > 120) return { ok: false, testo: 'Scrivi il nome' }
  let e164: string | null = null
  if (typeof telefono === 'string' && telefono.trim() !== '') {
    try {
      e164 = telefonoE164(telefono)
    } catch {
      return { ok: false, testo: 'Il numero di telefono non è valido' }
    }
  }
  return scrivi((c) => c.from('client').update({ full_name: nome.trim(), phone: e164 }).eq('id', id))
}

/** Una cliente nuova, dalla pagina Clienti. L'id nasce qui, così la pagina la apre subito dopo. */
export async function creaCliente(nome: string, telefono: string): Promise<EsitoScrittura & { id?: string }> {
  if (typeof nome !== 'string' || nome.trim() === '' || nome.trim().length > 120) return { ok: false, testo: 'Scrivi nome e cognome' }
  let e164: string | null = null
  if (typeof telefono === 'string' && telefono.trim() !== '') {
    try {
      e164 = telefonoE164(telefono)
    } catch {
      return { ok: false, testo: 'Il numero di telefono non è valido' }
    }
  }
  const id = crypto.randomUUID()
  const esito = await scrivi((c) => c.from('client').insert({ id, full_name: nome.trim(), phone: e164 }))
  return esito.ok ? { ...esito, id } : esito
}
