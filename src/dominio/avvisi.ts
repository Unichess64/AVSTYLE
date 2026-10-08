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
import { oraDaCella, pezziData, staNellaFascia } from './tempo'

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
  /** Gli appuntamenti della stessa cliente nella settimana prima e in quella dopo. */
  readonly vicini?: readonly Vicino[]
}

/** Un appuntamento della stessa cliente in un altro giorno, letto da `leggiVicini`. */
export interface Vicino {
  readonly data: string
  readonly servizioId: string
  readonly visitaId: string
}

/** Quanti giorni da `a` a `b`, in giorni di calendario (UTC: nessun fuso li sposta). */
export function giorniFra(a: string, b: string): number {
  const [aa, am, ag] = pezziData(a)
  const [ba, bm, bg] = pezziData(b)
  return Math.round((Date.UTC(ba, bm - 1, bg) - Date.UTC(aa, am - 1, ag)) / 86_400_000)
}

const DATA_BREVE = new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
export function dataBreve(data: string): string {
  const [a, m, g] = pezziData(data)
  return DATA_BREVE.format(new Date(Date.UTC(a, m - 1, g)))
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

/**
 * Lo stesso servizio per la stessa cliente entro una settimana, in un altro
 * giorno: chi non conosce ancora i turni prenota due posti e ne terrà uno
 * (richiesta del salone, 08/10). Servizi diversi non fanno nascere niente; lo
 * stesso giorno lo dice già «già prenotata». Una chiave per cliente, servizio e data.
 */
function stessoServizio(i: IngressoAvvisi): Avviso[] {
  if (i.cliente === null || i.vicini === undefined) return []
  const cliente = i.cliente
  const servizi = [...new Set(i.servizi.map((s) => s.servizioId))]
  return servizi.flatMap((sid) => {
    const altri = i.vicini!
      .filter((v) => v.servizioId === sid && v.visitaId !== i.visitaId && v.data !== i.data && Math.abs(giorniFra(i.data, v.data)) <= 7)
      .map((v) => v.data)
    const date = [...new Set(altri)].sort()
    if (date.length === 0) return []
    const nome = i.nomiServizi.get(sid) ?? 'lo stesso servizio'
    return [{
      chiave: `stesso-servizio:${cliente.id}:${sid}:${i.data}`,
      motivo: `${cliente.nome} ha già ${nome} ${date.map(dataBreve).join(' e ')}: vuoi procedere comunque?`,
    }]
  })
}

export function calcolaAvvisi(i: IngressoAvvisi): Avviso[] {
  return [...fuoriOrario(i), ...giaPrenotata(i), ...sovrapposte(i), ...stessoServizio(i)]
}

/** D3-19: basta UNA chiave non confermata per fermare il salvataggio. */
export function fermaIlSalvataggio(avvisi: readonly Avviso[], confermati: ReadonlySet<string>): boolean {
  return avvisi.some((a) => !confermati.has(a.chiave))
}

/** «Salva comunque»: conferma le chiavi mostrate, in un insieme nuovo. */
export function confermaAvvisi(confermati: ReadonlySet<string>, mostrati: readonly Avviso[]): Set<string> {
  return new Set([...confermati, ...mostrati.map((a) => a.chiave)])
}
