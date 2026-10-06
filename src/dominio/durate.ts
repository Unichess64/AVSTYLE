// src/dominio/durate.ts
//
// Le durate dei servizi della scheda (spec 3a §5.4 punto 3, spec §8.1).
//
//   — La durata viene da `operator_service.duration_cells` se c'è, altrimenti
//     da `service.default_duration_cells` (D3, D28; `0002_catalogue.sql:25`,
//     `:13`).
//   — Si ricalcola al cambio di servizio o di operatrice SOLO se non è stata
//     modificata a mano.
//   — «+ Aggiungi servizio» accoda dopo il precedente con la sua pausa
//     (`buffer_after_cells`, `0002:16`); i servizi accodati seguono il
//     precedente finché non vengono spostati a mano.
import type { Partenza, ServizioInScheda } from './scheda'
import { CELLE_PER_GIORNO } from './tempo'

export interface ServizioDelCatalogo {
  readonly id: string
  readonly nome: string
  readonly categoria: string
  /** `service.default_duration_cells` */
  readonly durata: number
  /** `service.buffer_after_cells` */
  readonly pausa: number
  readonly attivo: boolean
}

/** Il catalogo, già nell'ordine del salone (categoria, poi servizio). */
export interface Catalogo {
  readonly servizi: readonly ServizioDelCatalogo[]
  /** `operator_service`: `durata` nulla vuol dire «quella del servizio». */
  readonly durateOperatrice: readonly { readonly operatriceId: string; readonly servizioId: string; readonly durata: number | null }[]
}

function servizioDi(c: Catalogo, servizioId: string): ServizioDelCatalogo {
  const s = c.servizi.find((x) => x.id === servizioId)
  if (s === undefined) throw new RangeError(`servizio fuori dal catalogo: ${servizioId}`)
  return s
}

export function durataDi(c: Catalogo, operatriceId: string, servizioId: string): number {
  const propria = c.durateOperatrice.find((r) => r.operatriceId === operatriceId && r.servizioId === servizioId)
  return propria?.durata ?? servizioDi(c, servizioId).durata
}

export function pausaDi(c: Catalogo, servizioId: string): number {
  return servizioDi(c, servizioId).pausa
}

// Un accodato non comincia dopo le 23:55: oltre, `oraDaCella` solleva e la
// scheda cadeva (revisione del Task 7, C1). Che finisca dopo mezzanotte lo dice
// `cosaManca`, che tiene spento «Salva».
const ULTIMA_CELLA = CELLE_PER_GIORNO - 1

/**
 * Riporta ogni servizio accodato dietro al precedente: `inizio` = inizio del
 * precedente + la sua durata + la sua pausa. Si percorre in ordine, così una
 * catena di tre segue il primo.
 */
function riallinea(servizi: readonly ServizioInScheda[], c: Catalogo): ServizioInScheda[] {
  const fuori: ServizioInScheda[] = []
  for (const s of servizi) {
    const prima = fuori[fuori.length - 1]
    fuori.push(
      s.segueIlPrecedente && prima !== undefined
        ? { ...s, inizio: Math.min(prima.inizio + prima.durata + pausaDi(c, prima.servizioId), ULTIMA_CELLA) }
        : s,
    )
  }
  return fuori
}

function cambia(
  servizi: readonly ServizioInScheda[],
  id: string,
  c: Catalogo,
  f: (s: ServizioInScheda) => ServizioInScheda,
): ServizioInScheda[] {
  return riallinea(servizi.map((s) => (s.id === id ? f(s) : s)), c)
}

export function cambiaServizio(servizi: readonly ServizioInScheda[], id: string, servizioId: string, c: Catalogo) {
  return cambia(servizi, id, c, (s) => ({
    ...s,
    servizioId,
    durata: s.durataAMano ? s.durata : durataDi(c, s.operatriceId, servizioId),
  }))
}

export function cambiaOperatrice(servizi: readonly ServizioInScheda[], id: string, operatriceId: string, c: Catalogo) {
  return cambia(servizi, id, c, (s) => ({
    ...s,
    operatriceId,
    durata: s.durataAMano ? s.durata : durataDi(c, operatriceId, s.servizioId),
  }))
}

/** Una durata scritta a mano non si ricalcola più (§5.4 punto 3). */
export function cambiaDurata(servizi: readonly ServizioInScheda[], id: string, durata: number, c: Catalogo) {
  return cambia(servizi, id, c, (s) => ({ ...s, durata, durataAMano: true }))
}

/** Un inizio scritto a mano stacca il servizio dal precedente. */
export function cambiaInizio(servizi: readonly ServizioInScheda[], id: string, inizio: number, c: Catalogo) {
  return cambia(servizi, id, c, (s) => ({ ...s, inizio, segueIlPrecedente: false }))
}

/**
 * «+ Aggiungi servizio»: accoda dopo l'ultimo con la sua pausa, con la stessa
 * operatrice. In una scheda vuota il primo parte dal posto toccato.
 */
export function aggiungiServizio(
  servizi: readonly ServizioInScheda[],
  partenza: Partenza,
  servizioId: string,
  c: Catalogo,
): ServizioInScheda[] {
  const ultimo = servizi[servizi.length - 1]
  const operatriceId = ultimo?.operatriceId ?? partenza.operatriceId
  const nuovo: ServizioInScheda = {
    id: crypto.randomUUID(),
    nuovo: true,
    operatriceId,
    servizioId,
    inizio: partenza.inizio,
    durata: durataDi(c, operatriceId, servizioId),
    durataAMano: false,
    segueIlPrecedente: ultimo !== undefined,
  }
  return riallinea([...servizi, nuovo], c)
}

export interface GruppoDiServizi {
  readonly categoria: string
  readonly servizi: readonly ServizioDelCatalogo[]
}

/**
 * Le voci della scelta del servizio (spec §8.1): quelli che l'operatrice fa,
 * raggruppati per categoria, oppure — «mostra tutti i servizi» — tutti gli
 * attivi. L'ordine è quello del catalogo.
 */
export function serviziPerLaScelta(c: Catalogo, operatriceId: string, tutti: boolean): GruppoDiServizi[] {
  const suoi = new Set(c.durateOperatrice.filter((r) => r.operatriceId === operatriceId).map((r) => r.servizioId))
  const gruppi: { categoria: string; servizi: ServizioDelCatalogo[] }[] = []
  for (const s of c.servizi) {
    if (!s.attivo || (!tutti && !suoi.has(s.id))) continue
    const g = gruppi.find((x) => x.categoria === s.categoria)
    if (g) g.servizi.push(s)
    else gruppi.push({ categoria: s.categoria, servizi: [s] })
  }
  return gruppi
}
