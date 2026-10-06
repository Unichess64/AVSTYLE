// src/dominio/avvisi.ts
//
// Gli avvisi che non bloccano (spec 3a §4.5): fuori orario (D18, spec §8.4),
// cliente già prenotata lo stesso giorno (D25, spec §8.5), e la stessa cliente
// in due servizi sovrapposti della stessa visita. Riga ambra con il motivo.
//
// Ognuno ha una CHIAVE, e «Salva comunque» conferma le chiavi mostrate. Un
// avviso con una chiave non confermata ferma il salvataggio (D3-19): è ciò che
// fa fermare un salvataggio già confermato una volta quando nasce un avviso
// NUOVO. Per questo la chiave porta l'appuntamento e non solo il tipo.
//
// Calcolati qui mentre si compila, e di nuovo dal server al salvataggio
// (Task 8): la funzione è la stessa.
import type { AppuntamentoLetto } from './blocchi'
import type { GiornoRisolto } from './finestra'
import type { ServizioInScheda } from './scheda'
import { oraDaCella, staNellaFascia } from './tempo'

export interface Avviso {
  readonly chiave: string
  readonly motivo: string
}

export interface IngressoAvvisi {
  readonly visitaId: string
  readonly data: string
  /** La cliente con il nome da mostrare; `null` se non è ancora scelta. */
  readonly cliente: { readonly id: string; readonly nome: string } | null
  readonly servizi: readonly ServizioInScheda[]
  /** La lettura del giorno di `data`: fasce per operatrice e appuntamenti. */
  readonly giorno: {
    readonly risolti: ReadonlyMap<string, Pick<GiornoRisolto, 'ranges' | 'dayStatus'>>
    readonly appuntamenti: readonly AppuntamentoLetto[]
  }
  readonly nomiOperatrici: ReadonlyMap<string, string>
  readonly nomiServizi: ReadonlyMap<string, string>
}

function fuoriOrario(i: IngressoAvvisi): Avviso[] {
  return i.servizi.flatMap((s) => {
    const r = i.giorno.risolti.get(s.operatriceId)
    const ranges = r?.ranges ?? []
    if (ranges.some((f) => staNellaFascia(s.inizio, s.durata, f))) return []
    const cosa = `${i.nomiServizi.get(s.servizioId) ?? 'Il servizio'} alle ${oraDaCella(s.inizio)}`
    const chi = i.nomiOperatrici.get(s.operatriceId) ?? 'l’operatrice'
    const motivo =
      r?.dayStatus === 'salon_closed'
        ? `${cosa}: quel giorno il salone è chiuso`
        : r === undefined || r.dayStatus === 'operator_off' || ranges.length === 0
          ? `${cosa}: quel giorno ${chi} non lavora`
          : `${cosa} è fuori dall’orario di ${chi}`
    return [{ chiave: `fuori-orario:${s.id}`, motivo }]
  })
}

/** Spec §8.5: «Maria Rossi è già prenotata alle 10:00 con Vera». Una chiave per cliente e giorno. */
function giaPrenotata(i: IngressoAvvisi): Avviso[] {
  if (i.cliente === null) return []
  const cliente = i.cliente
  const propri = new Set(i.servizi.map((s) => s.id))
  const altrove = i.giorno.appuntamenti
    .filter((a) => a.clienteId === cliente.id && a.visitaId !== i.visitaId && !propri.has(a.id))
    .sort((x, y) => x.inizio - y.inizio)
  if (altrove.length === 0) return []
  const dove = altrove
    .map((a) => `alle ${oraDaCella(a.inizio)} con ${i.nomiOperatrici.get(a.operatriceId) ?? 'un’altra operatrice'}`)
    .join(' e ')
  return [{ chiave: `gia-prenotata:${cliente.id}:${i.data}`, motivo: `${cliente.nome} è già prenotata ${dove}` }]
}

/** §4.5: due servizi della stessa visita che si sovrappongono nel tempo, qualunque operatrice. */
function sovrapposte(i: IngressoAvvisi): Avviso[] {
  if (i.cliente === null) return []
  const avvisi: Avviso[] = []
  for (let p = 0; p < i.servizi.length; p++) {
    for (let q = p + 1; q < i.servizi.length; q++) {
      const [x, y] = [i.servizi[p], i.servizi[q]].sort((m, n) => m.inizio - n.inizio)
      if (y.inizio >= x.inizio + x.durata) continue
      const [idA, idB] = [x.id, y.id].sort()
      const nome = (s: ServizioInScheda) => i.nomiServizi.get(s.servizioId) ?? 'un servizio'
      avvisi.push({
        chiave: `sovrapposta:${idA}:${idB}`,
        motivo: `${i.cliente.nome} avrebbe ${nome(x)} e ${nome(y)} insieme alle ${oraDaCella(y.inizio)}`,
      })
    }
  }
  return avvisi
}

export function calcolaAvvisi(i: IngressoAvvisi): Avviso[] {
  return [...fuoriOrario(i), ...giaPrenotata(i), ...sovrapposte(i)]
}

/** D3-19: basta UNA chiave non confermata per fermare il salvataggio. */
export function fermaIlSalvataggio(avvisi: readonly Avviso[], confermati: ReadonlySet<string>): boolean {
  return avvisi.some((a) => !confermati.has(a.chiave))
}

/** «Salva comunque»: conferma le chiavi mostrate, in un insieme nuovo. */
export function confermaAvvisi(confermati: ReadonlySet<string>, mostrati: readonly Avviso[]): Set<string> {
  return new Set([...confermati, ...mostrati.map((a) => a.chiave)])
}
