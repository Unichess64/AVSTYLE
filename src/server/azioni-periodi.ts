'use server'
// src/server/azioni-periodi.ts — assenze di un'operatrice e chiusure del salone.
// Prima l'anteprima (gli appuntamenti che ci cadono dentro), poi la scrittura.
import { type AppuntamentoColpito, type Coppia, colpitiDaAssenza, colpitiDaChiusura, validaPeriodo } from '../dominio/periodi'
import { appuntamentiNelPeriodo } from './lettura-periodi'
import { type EsitoScrittura, USCITA, scrivi } from './scrittura-semplice'
import { NonAutenticata, NonOperatrice, clientServer, operatriceCorrente } from './supabase'

export type Anteprima =
  | { readonly ok: true; readonly colpiti: readonly AppuntamentoColpito[] }
  | { readonly ok: false; readonly testo: string; readonly uscita?: boolean }

const fasceValide = (f: unknown): f is Coppia[] =>
  Array.isArray(f) &&
  f.every((x) => Array.isArray(x) && x.length === 2 && Number.isInteger(x[0]) && Number.isInteger(x[1]) && x[0] >= 0 && x[1] <= 288 && x[0] < x[1])
const confine = (c: unknown): c is number => Number.isInteger(c) && (c as number) >= 0 && (c as number) <= 288

async function leggi(dal: string, al: string, operatriceId: string | null): Promise<Anteprima | AppuntamentoColpito[]> {
  const client = await clientServer()
  try {
    await operatriceCorrente(client)
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return USCITA as Anteprima
    throw e
  }
  try {
    return await appuntamentiNelPeriodo(client, dal, al, operatriceId)
  } catch {
    return { ok: false, testo: 'Non riesco a leggere gli appuntamenti: riprova' }
  }
}

export async function anteprimaAssenza(operatriceId: string, dal: string, al: string, fasce: Coppia[]): Promise<Anteprima> {
  const no = validaPeriodo(dal, al) ?? (fasceValide(fasce) ? null : 'Orario non valido')
  if (no !== null) return { ok: false, testo: no }
  const r = await leggi(dal, al, operatriceId)
  return Array.isArray(r) ? { ok: true, colpiti: colpitiDaAssenza(r, fasce) } : r
}

/** Sostituisce ogni giorno del periodo: `fasce` vuote = assente tutto il giorno. */
export async function salvaAssenza(operatriceId: string, dal: string, al: string, fasce: Coppia[]): Promise<EsitoScrittura> {
  const no = validaPeriodo(dal, al) ?? (fasceValide(fasce) ? null : 'Orario non valido')
  if (no !== null) return { ok: false, testo: no }
  return scrivi(
    (c) => c.rpc('write_exception_days', { p_operator_id: operatriceId, p_from: dal, p_to: al, p_ranges: fasce.length === 0 ? null : fasce }),
    {
      '23P01': 'Due fasce si sovrappongono',
      exception_day_operator_id_exception_date_key: 'Una collega ha appena scritto su questi giorni: ricarica e guarda com’è adesso',
    },
  )
}

/** Toglie le eccezioni del periodo: in quei giorni torna la settimana tipo. */
export async function cancellaAssenza(operatriceId: string, dal: string, al: string): Promise<EsitoScrittura> {
  if (validaPeriodo(dal, al) !== null) return { ok: false, testo: 'Periodo non valido' }
  return scrivi((c) =>
    c.from('exception_day').delete().eq('operator_id', operatriceId).gte('exception_date', dal).lte('exception_date', al),
  )
}

export async function anteprimaChiusura(dal: string, al: string, da: number | null, a: number | null): Promise<Anteprima> {
  const no = validaPeriodo(dal, al)
  if (no !== null) return { ok: false, testo: no }
  if ((da === null) !== (a === null) || (da !== null && (!confine(da) || !confine(a) || a! <= da))) {
    return { ok: false, testo: 'L’orario della chiusura non è valido' }
  }
  const r = await leggi(dal, al, null)
  return Array.isArray(r) ? { ok: true, colpiti: colpitiDaChiusura(r, da, a) } : r
}

export async function salvaChiusura(dal: string, al: string, da: number | null, a: number | null, motivo: string): Promise<EsitoScrittura> {
  const no = validaPeriodo(dal, al)
  if (no !== null) return { ok: false, testo: no }
  if (typeof motivo !== 'string' || motivo.trim() === '' || motivo.trim().length > 120) {
    return { ok: false, testo: 'Scrivi il motivo della chiusura' }
  }
  if ((da === null) !== (a === null) || (da !== null && (!confine(da) || !confine(a) || a! <= da))) {
    return { ok: false, testo: 'L’orario della chiusura non è valido' }
  }
  return scrivi((c) =>
    c.from('salon_closure').insert({ start_date: dal, end_date: al, from_boundary: da, to_boundary: a, reason: motivo.trim() }),
  )
}

export async function cancellaChiusura(id: string): Promise<EsitoScrittura> {
  return scrivi((c) => c.from('salon_closure').delete().eq('id', id))
}
