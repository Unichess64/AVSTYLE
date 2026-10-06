// src/dominio/conflitti.ts
//
// La frase di spec §10.1. Si costruisce dall'appuntamento CHE POSSIEDE la
// cella, non dalla cella: un appuntamento 14:00–15:00 e una prenotazione alle
// 14:30 si scontrano alle 14:30, un'ora a cui non comincia niente, e la frase
// giusta è «Annalisa ha un appuntamento alle 14:00 con Maria Rossi».
//
// Esclude TUTTI gli appuntamenti in scrittura — nuovi, modificati e tolti —
// con la stessa esclusione di `proposeStarts` (`senzaEsclusi`, §7.4): senza,
// uno spostamento dentro la propria durata nominerebbe sé stesso.
//
// La pausa non è occupazione (spec §6.1, `0002:16`): qui si guardano solo le
// celle, come il vincolo `appointment_slot_unique`.
import type { AppuntamentoLetto } from './blocchi'
import { senzaEsclusi } from './proposte'
import { blocco, oraDaCella } from './tempo'

export interface Voluto {
  readonly id: string
  readonly operatriceId: string
  readonly inizio: number
  readonly durata: number
}

export interface Conflitto {
  /** Il bersaglio di «vai lì»: l'appuntamento che possiede la cella. */
  readonly appuntamentoId: string
  readonly frase: string
}

/**
 * Gli id in scrittura: quelli della scheda (nuovi e modificati) e quelli che
 * la visita aveva quando è stata letta, compresi i TOLTI.
 */
export function idInScrittura(voluti: readonly { readonly id: string }[], originali: readonly string[]): string[] {
  return [...new Set([...voluti.map((v) => v.id), ...originali])]
}

const sovrapposti = (a: { inizio: number; durata: number }, b: { inizio: number; durata: number }) =>
  a.inizio < b.inizio + b.durata && b.inizio < a.inizio + a.durata

export function trovaConflitti(
  voluti: readonly Voluto[],
  giorno: readonly AppuntamentoLetto[],
  escludi: readonly string[],
  nomiOperatrici: ReadonlyMap<string, string>,
): Conflitto[] {
  const nome = (id: string) => nomiOperatrici.get(id) ?? 'L’operatrice'
  const perId = new Map(giorno.map((a) => [a.id, a]))
  const occupati = senzaEsclusi(
    giorno.map((a) => blocco(a.id, a.inizio, a.durata, a.pausa)),
    escludi,
  )

  const trovati = new Map<string, Conflitto & { inizio: number }>()
  for (const v of voluti) {
    for (const b of occupati) {
      const a = perId.get(b.appointmentId)!
      if (a.operatriceId !== v.operatriceId) continue
      if (!sovrapposti(v, { inizio: b.startCell, durata: b.endCell - b.startCell + 1 })) continue
      trovati.set(a.id, {
        appuntamentoId: a.id,
        frase: `${nome(a.operatriceId)} ha un appuntamento alle ${oraDaCella(a.inizio)} con ${a.clienteNome}`,
        inizio: a.inizio,
      })
    }
  }

  // Due servizi della scheda sulla stessa operatrice che si sovrappongono: il
  // vincolo li rifiuterebbe con un `23505` che nessuna frase spiega.
  const ordinati = [...voluti].sort((x, y) => x.inizio - y.inizio || (x.id < y.id ? -1 : 1))
  for (let p = 0; p < ordinati.length; p++) {
    for (let q = p + 1; q < ordinati.length; q++) {
      const [x, y] = [ordinati[p], ordinati[q]]
      if (x.operatriceId !== y.operatriceId || !sovrapposti(x, y) || trovati.has(x.id)) continue
      trovati.set(x.id, {
        appuntamentoId: x.id,
        frase: `${nome(x.operatriceId)} ha già un servizio alle ${oraDaCella(x.inizio)} in questa visita`,
        inizio: x.inizio,
      })
    }
  }

  return [...trovati.values()]
    .sort((x, y) => x.inizio - y.inizio || (x.appuntamentoId < y.appuntamentoId ? -1 : 1))
    .map(({ appuntamentoId, frase }) => ({ appuntamentoId, frase }))
}

/** La frase con TUTTI i conflitti (§10.1), e il bersaglio del primo. */
export function fraseDeiConflitti(conflitti: readonly Conflitto[]): { frase: string; vaiA: string } | null {
  if (conflitti.length === 0) return null
  return { frase: conflitti.map((c) => c.frase).join('; '), vaiA: conflitti[0].appuntamentoId }
}
