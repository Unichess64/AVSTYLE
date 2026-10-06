// src/server/azioni-visita.ts
'use server'
//
// Le Server Actions di scrittura: un guscio sottile attorno ai corpi di
// `scrittura-visita.ts`, che passa il client di `clientServer()`. Tutto il
// resto — gli otto passi di §4.3, l'involucro, i ritentativi — sta là, dove le
// prove lo raggiungono con una sessione vera.
//
// ⚠︎ Ogni funzione esportata qui è raggiungibile con un POST diretto (§4.2):
// nessuna opzione di prova passa di qui, e gli argomenti si validano al passo 2.
// Il codice d'invio arriva dal telefono, uno per invio (§4.4).
import type { Atteso } from '../dominio/attesi'
import type { SchedaSerializzata } from '../dominio/scheda'
import { type Risposta, type RichiestaSpostamento, eliminaVisita, riportaVisita, salvaVisita, spostaVisita, togliServizio } from './scrittura-visita'
import { clientServer } from './supabase'

export async function salva(scheda: SchedaSerializzata, codice: string): Promise<Risposta> {
  return salvaVisita(await clientServer(), scheda, codice)
}

export async function togli(scheda: SchedaSerializzata, codice: string): Promise<Risposta> {
  return togliServizio(await clientServer(), scheda, codice)
}

export async function elimina(visitaId: string, versione: string, attesi: readonly Atteso[], codice: string): Promise<Risposta> {
  return eliminaVisita(await clientServer(), visitaId, versione, attesi, codice)
}

/** Il rilascio di un trascinamento (Task 10). Le versioni sono `null` al primo gesto: le legge il server. */
export async function sposta(richiesta: RichiestaSpostamento, codice: string): Promise<Risposta> {
  return spostaVisita(await clientServer(), richiesta, codice)
}

/** «Annulla» dopo uno spostamento: un codice d'invio suo, e le versioni adottate. */
export async function annullaSpostamento(richiesta: RichiestaSpostamento, codice: string): Promise<Risposta> {
  return riportaVisita(await clientServer(), richiesta, codice)
}
