// Il cercaposti: il percorso del telefono che squilla. Spec §8.3.

import type { Finestra } from './finestra'
import { proposeStarts } from './proposte'
import { sommaGiorni } from './tempo'
import type { IndiceCella, MotivoAssenza } from './tipi'

/** Spec §8.3: l'orizzonte è di 28 giorni, estremi compresi. */
export const ORIZZONTE_GIORNI = 28

export interface RigaProposta {
  readonly date: string
  readonly operatorId: string
  readonly startCell: IndiceCella
}

export interface IngressoCercaposti {
  readonly from: string
  readonly days: number
  /** Già ristretto alle operatrici ATTIVE che eseguono i servizi (§7.4). */
  readonly operatorIds: readonly string[]
  readonly finestra: Finestra
  readonly durations: readonly number[]
  readonly buffers: readonly number[]
  readonly excludeAppointmentIds: readonly string[]
  /** La data civile di oggi in Europe/Rome, o `null` se non serve filtrare. */
  readonly today: string | null
  readonly nowCell: IndiceCella | null
  readonly preferredOperatorId: string | null
  readonly limit: number
}

export interface EsitoCercaposti {
  readonly rows: RigaProposta[]
  readonly reason: MotivoAssenza | null
}

/**
 * D2-7: quando 28 giorni non danno niente, si riporta il motivo PIÙ
 * INFORMATIVO fra quelli raccolti. `full` per primo perché esistono giorni in
 * cui il servizio ci starebbe, quindi «estendi l'orizzonte» è un consiglio
 * sensato; `service_too_long` per secondo perché estendere non servirà mai.
 */
const PRECEDENZA_MOTIVI: readonly MotivoAssenza[] = [
  'full',
  'service_too_long',
  'operator_off',
  'salon_closed',
]

export function cercaPosti(ingresso: IngressoCercaposti): EsitoCercaposti {
  const rows: RigaProposta[] = []
  const motiviVisti = new Set<MotivoAssenza>()
  const ordineChiamante = new Map(ingresso.operatorIds.map((id, i) => [id, i]))

  for (let scarto = 0; scarto < ingresso.days; scarto++) {
    const date = sommaGiorni(ingresso.from, scarto)

    // Si raccoglie l'INTERA giornata, di tutte le operatrici, prima di
    // ordinare e prima di troncare (D2-11): tagliare dentro il ciclo delle
    // operatrici riempiva la prima pagina con cinque proposte della stessa
    // persona a cinque minuti l'una dall'altra, e l'altra operatrice che
    // lavorava quel giorno non compariva mai.
    const delGiorno: RigaProposta[] = []
    for (const operatorId of ingresso.operatorIds) {
      const giorno = ingresso.finestra.giorno(operatorId, date)
      const esito = proposeStarts({
        date,
        ranges: giorno.ranges,
        occupancy: giorno.occupancy,
        durations: ingresso.durations,
        buffers: ingresso.buffers,
        // `nowCell` vale SOLO per il giorno che è oggi: applicarlo a ogni
        // giorno toglierebbe il mattino a tutte le date future.
        nowCell: ingresso.today !== null && date === ingresso.today ? ingresso.nowCell : null,
        excludeAppointmentIds: ingresso.excludeAppointmentIds,
        dayStatus: giorno.dayStatus,
      })

      if (esito.reason !== null) motiviVisti.add(esito.reason)
      for (const startCell of esito.starts) delGiorno.push({ date, operatorId, startCell })
    }

    // Ordine completo, e totale: orario, poi la preferita, poi l'ordine in cui
    // il chiamante ha passato le operatrici. La data è già fissata dal ciclo
    // esterno, quindi non può essere scavalcata da una preferenza.
    delGiorno.sort((a, b) => {
      if (a.startCell !== b.startCell) return a.startCell - b.startCell
      const preferitaA = a.operatorId === ingresso.preferredOperatorId ? 0 : 1
      const preferitaB = b.operatorId === ingresso.preferredOperatorId ? 0 : 1
      if (preferitaA !== preferitaB) return preferitaA - preferitaB
      return (ordineChiamante.get(a.operatorId) ?? 0) - (ordineChiamante.get(b.operatorId) ?? 0)
    })

    for (const riga of delGiorno) {
      rows.push(riga)
      if (rows.length >= ingresso.limit) return { rows, reason: null }
    }
  }

  if (rows.length > 0) return { rows, reason: null }
  const motivo = PRECEDENZA_MOTIVI.find((m) => motiviVisti.has(m)) ?? null
  return { rows, reason: motivo }
}
