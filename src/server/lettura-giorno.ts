// src/server/lettura-giorno.ts
//
// La lettura del giorno, in due chiamate e non in una.
//
// `availability_window` porta MATERIALE GREZZO di disponibilità e occupazione,
// e non porta né il nome della cliente né quello del servizio: sono fuori dal
// suo contratto, e allargarlo vorrebbe una migrazione. La seconda chiamata è un
// `select` di PostgREST su `appointment` con le risorse annidate, filtrato SOLO
// su `appointment_date`: §4.8 vieta i FILTRI su dati delle clienti
// nell'indirizzo, non la lettura del nome che l'agenda deve disegnare.
//
// ⚠︎ `availability_window` filtra le disattivate su disponibilità ed eccezioni
// ma NON sull'occupazione (D2-10): è ciò che serve a §9.1, la colonna di una
// disattivata resta finché ha appuntamenti nel giorno mostrato. Non si
// aggiunge nessun filtro sopra.
import type { SupabaseClient } from '@supabase/supabase-js'
import { type AppuntamentoLetto, finestraVerticale } from '../dominio/blocchi'
import { type DocumentoFinestra, type GiornoRisolto, decodificaFinestra } from '../dominio/finestra'
import { validaDocumentoFinestra } from '../dominio/validazione'

export type { AppuntamentoLetto } from '../dominio/blocchi'

// Una colonna dell'agenda: attiva, oppure disattivata ma con appuntamenti nel
// giorno mostrato (spec §9.1).
export interface OperatriceInColonna {
  readonly id: string
  readonly nome: string
  readonly colore: string       // da `operator.color`, mai inchiodato
  readonly attiva: boolean      // false = resta perché ha appuntamenti
  readonly sonoIo: boolean      // l'etichetta «tu» di §5.1, non un colore
}

export interface Giorno {
  readonly data: string
  readonly operatrici: readonly OperatriceInColonna[]   // già ordinate
  readonly finestra: { readonly da: number; readonly a: number }  // il taglio verticale
  readonly appuntamenti: readonly AppuntamentoLetto[]
  readonly risolti: ReadonlyMap<string, GiornoRisolto>  // per operatrice
  /**
   * Le chiusure che toccano il giorno, per la fascia del motivo di §5.1.
   * `da` e `a` nulli insieme: giornata intera.
   */
  readonly chiusure: readonly { readonly motivo: string; readonly da: number | null; readonly a: number | null }[]
}

interface RigaOperatrice {
  id: string
  name: string
  color: string
  is_active: boolean
}

// La forma delle risorse annidate come PostgREST le restituisce: a-uno, quindi
// oggetti e non elenchi.
interface RigaAppuntamento {
  id: string
  visit_id: string
  operator_id: string
  service_id: string
  start_cell: number
  cell_count: number
  service: { name: string; buffer_after_cells: number } | null
  visit: { client: { id: string; full_name: string } | null } | null
}

/**
 * Prende il client come argomento, come `operatriceCorrente`: la pagina gli
 * passa quello di `clientServer()`, le prove uno con il token. `io` è
 * l'`operator.id` dell'account, che decide l'etichetta «tu».
 *
 * Un errore di PostgREST solleva: un guasto non è un giorno vuoto.
 */
export async function leggiGiorno(client: SupabaseClient, data: string, io: string): Promise<Giorno> {
  const [operatori, impostazioni] = await Promise.all([
    client.from('operator').select('id, name, color, is_active').order('sort_order').order('name'),
    client.from('salon_settings').select('day_start_boundary, day_end_boundary').single(),
  ])
  if (operatori.error !== null) throw new Error(`lettura di operator fallita: ${operatori.error.code}`)
  if (impostazioni.error !== null) throw new Error(`lettura di salon_settings fallita: ${impostazioni.error.code}`)
  const tutte = operatori.data as RigaOperatrice[]

  // Tutte, disattivate comprese: la funzione stessa toglie loro disponibilità
  // ed eccezioni e lascia l'occupazione.
  const finestra = await client.rpc('availability_window', {
    p_from: data,
    p_to: data,
    p_operator_ids: tutte.map((o) => o.id),
  })
  if (finestra.error !== null) throw new Error(`availability_window fallita: ${finestra.error.code}`)
  const documento = validaDocumentoFinestra(finestra.data as DocumentoFinestra)   // CONTORNO-CERCAPOSTI

  // ⚠︎ `updated_at` NON è nella select, ed è una decisione: le versioni vengono
  // solo da `stato_visita`, mai da questa lettura.
  //
  // ⚠︎ `visit` si raggiunge per il NOME del vincolo: la chiave esterna è
  // composta, `(visit_id, appointment_date) → visit (id, visit_date)`
  // (0004:26-29), e con `visit:visit_id (…)` PostgREST risponde PGRST200.
  const lettura = await client
    .from('appointment')
    .select(`
      id, visit_id, operator_id, service_id, start_cell, cell_count,
      service:service_id ( name, buffer_after_cells ),
      visit:visit!appointment_visit_date_fk ( client:client_id ( id, full_name ) )
    `)
    .eq('appointment_date', data)             // ⚠︎ l'UNICO filtro. Mai su client.*
    .order('start_cell')
  if (lettura.error !== null) throw new Error(`lettura di appointment fallita: ${lettura.error.code}`)

  const appuntamenti: AppuntamentoLetto[] = (lettura.data as unknown as RigaAppuntamento[]).map((r) => {
    // La sicurezza per riga lascia vedere tutto o niente a un'operatrice
    // attiva: una risorsa annidata nulla è un'incoerenza, non un caso.
    if (r.service === null || r.visit === null || r.visit.client === null) {
      throw new Error(`appuntamento ${r.id} senza servizio o cliente leggibile`)
    }
    return {
      id: r.id,
      visitaId: r.visit_id,
      operatriceId: r.operator_id,
      servizioId: r.service_id,
      servizioNome: r.service.name,
      clienteId: r.visit.client.id,
      clienteNome: r.visit.client.full_name,
      inizio: r.start_cell,
      durata: r.cell_count,
      pausa: r.service.buffer_after_cells,
    }
  })

  const conAppuntamenti = new Set(appuntamenti.map((a) => a.operatriceId))
  const operatrici: OperatriceInColonna[] = tutte
    .filter((o) => o.is_active || conAppuntamenti.has(o.id))
    .map((o) => ({ id: o.id, nome: o.name, colore: o.color, attiva: o.is_active, sonoIo: o.id === io }))

  const decodificata = decodificaFinestra(documento)
  const risolti = new Map<string, GiornoRisolto>()
  for (const o of operatrici) risolti.set(o.id, decodificata.giorno(o.id, data))

  const chiusure = documento.closures
    .filter((c) => c.start_date <= data && c.end_date >= data)
    .map((c) => ({ motivo: c.reason, da: c.from_boundary, a: c.to_boundary }))

  return {
    data,
    operatrici,
    finestra: finestraVerticale(
      appuntamenti,
      [...risolti.values()].flatMap((r) => r.ranges),
      { da: impostazioni.data.day_start_boundary, a: impostazioni.data.day_end_boundary },
    ),
    appuntamenti,
    risolti,
    chiusure,
  }
}
