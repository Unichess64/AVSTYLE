'use server'
// src/server/azioni-impostazioni.ts — le scritture di Impostazioni: orario, categorie, servizi.
// Ogni scrittura è UNA istruzione, quindi una transazione: niente stati a metà.
import { NonAutenticata, NonOperatrice, clientServer, operatriceCorrente } from './supabase'

export type EsitoImpostazioni =
  | { readonly ok: true }
  | { readonly ok: false; readonly testo: string; readonly uscita?: boolean }

const RIPROVA = 'Non sono riuscita a salvare, riprova'
const USCITA: EsitoImpostazioni = { ok: false, testo: 'La sessione è chiusa: rientra.', uscita: true }

type Client = Awaited<ReturnType<typeof clientServer>>
type Risposta = { error: { code?: string; message: string } | null }

/** Identità, scrittura, traduzione dell'errore. `frasi` dà la frase per codice o per vincolo. */
async function scrivi(
  scrittura: (c: Client) => PromiseLike<Risposta>,
  frasi: Record<string, string> = {},
): Promise<EsitoImpostazioni> {
  const client = await clientServer()
  try {
    await operatriceCorrente(client)
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return USCITA
    throw e
  }
  const r = await scrittura(client)
  if (r.error === null) return { ok: true }
  const codice = r.error.code ?? 'nessuno'
  console.error('impostazioni: scrittura fallita', { code: codice, id: crypto.randomUUID() })
  if (codice === '42501') return USCITA
  const vincolo = /constraint "([^"]+)"/.exec(r.error.message)?.[1]
  return { ok: false, testo: (vincolo !== undefined ? frasi[vincolo] : undefined) ?? frasi[codice] ?? RIPROVA }
}

const nomeValido = (n: unknown): n is string => typeof n === 'string' && n.trim().length > 0 && n.trim().length <= 80
const celle = (n: unknown, min: number, max: number): n is number => Number.isInteger(n) && (n as number) >= min && (n as number) <= max

export async function salvaOrarioSalone(inizio: number, fine: number): Promise<EsitoImpostazioni> {
  if (!celle(inizio, 0, 288) || !celle(fine, 0, 288) || fine <= inizio) {
    return { ok: false, testo: 'La chiusura deve venire dopo l’apertura' }
  }
  return scrivi((c) =>
    c.from('salon_settings').update({ day_start_boundary: inizio, day_end_boundary: fine }).eq('id', true),
  )
}

export async function aggiungiCategoria(nome: string): Promise<EsitoImpostazioni> {
  if (!nomeValido(nome)) return { ok: false, testo: 'Scrivi il nome della categoria' }
  return scrivi((c) => c.from('service_category').insert({ name: nome.trim() }))
}

export async function cancellaCategoria(id: string): Promise<EsitoImpostazioni> {
  return scrivi((c) => c.from('service_category').delete().eq('id', id), {
    service_category_id_fkey: 'Questa categoria ha ancora dei servizi',
  })
}

export interface DatiServizio {
  readonly id: string | null
  readonly nome: string
  readonly categoriaId: string
  readonly durata: number
  readonly pausa: number
}

export async function salvaServizio(s: DatiServizio): Promise<EsitoImpostazioni> {
  if (!nomeValido(s.nome)) return { ok: false, testo: 'Scrivi il nome del servizio' }
  if (typeof s.categoriaId !== 'string' || s.categoriaId === '') return { ok: false, testo: 'Scegli la categoria' }
  if (!celle(s.durata, 1, 288) || !celle(s.pausa, 0, 288)) return { ok: false, testo: 'Durata o pausa non valide' }
  const riga = {
    name: s.nome.trim(),
    category_id: s.categoriaId,
    default_duration_cells: s.durata,
    buffer_after_cells: s.pausa,
  }
  return scrivi((c) =>
    s.id === null ? c.from('service').insert(riga) : c.from('service').update(riga).eq('id', s.id),
  )
}

export async function attivaServizio(id: string, attivo: boolean): Promise<EsitoImpostazioni> {
  return scrivi((c) => c.from('service').update({ is_active: attivo }).eq('id', id))
}

/** Chi esegue un servizio. Una spunta ripetuta da una schermata vecchia non è un errore. */
export async function impostaEsecuzione(servizioId: string, operatriceId: string, esegue: boolean): Promise<EsitoImpostazioni> {
  const esito = await scrivi(
    (c) =>
      esegue
        ? c.from('operator_service').insert({ operator_id: operatriceId, service_id: servizioId })
        : c.from('operator_service').delete().eq('operator_id', operatriceId).eq('service_id', servizioId),
    { operator_service_pkey: 'C’è già' },
  )
  return !esito.ok && esito.testo === 'C’è già' ? { ok: true } : esito
}
