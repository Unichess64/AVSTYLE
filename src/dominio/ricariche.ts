// src/dominio/ricariche.ts
//
// Il modello puro dell'aggiornamento in diretta (spec 3a §4.6, D3-12, D3-16;
// piano 3a-2 Task 11). Il telefono che lo esegue è `src/cliente/diretta.ts`;
// qui si decide soltanto.
//
// Tre domande:
//   — un annuncio riguarda ciò che il telefono mostra? Il messaggio porta solo
//     DATE, come testo 'YYYY-MM-DD' (`0019_annunci.sql`), e il confronto si fa
//     fra stringhe: un `Date` le rileggerebbe nell'ora del telefono, e a ovest
//     di UTC il 25 diventerebbe il 24;
//   — rileggere adesso o dopo? Durante un gesto o un salvataggio la ricarica si
//     mette da parte e si applica subito dopo (§4.6); un giorno riletto chiesto
//     PRIMA di un ✓ e arrivato dopo non si applica, e si rilegge (§5.1);
//   — che cosa diventa «oggi» dopo la mezzanotte di Perugia (§7)?
import { oggiAPerugia } from './perugia'
import { sommaGiorni } from './tempo'

const DATA = /^\d{4}-\d{2}-\d{2}$/

/**
 * `true` se l'annuncio nomina uno dei giorni mostrati: il giorno della vista,
 * o uno dei sette della settimana. Il messaggio arriva dalla rete, quindi
 * `unknown`: una forma storta non riguarda niente, e i ripieghi coprono il caso.
 */
export function annuncioRiguarda(giorni: unknown, mostrati: readonly string[]): boolean {
  if (!Array.isArray(giorni)) return false
  return giorni.some((g) => typeof g === 'string' && DATA.test(g) && mostrati.includes(g))
}

/**
 * Le riletture del giorno. Non si CONTANO: le riletture di Next girano in
 * fila, ciascuna chiede il giorno quando parte, e React disegna soltanto
 * l'ultima in coda — N riletture accavallate danno UN arrivo (revisione del
 * Task 11, B1: un conto che presupponeva un arrivo per rilettura accumulava
 * debiti a ogni salvataggio di una collega, e dopo un ✓ inchiodava il blocco
 * per minuti). Basta sapere se dopo l'ultimo ✓ è già partita una rilettura:
 * se sì, il giorno che arriva la contiene.
 */
export interface StatoRicariche {
  /** Dopo l'ultimo ✓: niente da aspettare, una rilettura ancora da chiedere, o già chiesta. */
  readonly dopoLaSpunta: 'nessuna' | 'da_chiedere' | 'chiesta'
  /** Una ricarica chiesta mentre il telefono era occupato. */
  readonly messaDaParte: boolean
}

export const RICARICHE_INIZIALI: StatoRicariche = { dopoLaSpunta: 'nessuna', messaDaParte: false }

export interface Passo {
  readonly stato: StatoRicariche
  /** Si rilegge adesso. */
  readonly rileggi: boolean
}

/** Una ricarica chiesta (annuncio, ripiego, esito): adesso, o messa da parte se il telefono è occupato. */
export function chiedi(s: StatoRicariche, occupato: boolean): Passo {
  if (occupato) return { stato: { ...s, messaDaParte: true }, rileggi: false }
  const dopoLaSpunta = s.dopoLaSpunta === 'da_chiedere' ? 'chiesta' : s.dopoLaSpunta
  return { stato: { dopoLaSpunta, messaDaParte: false }, rileggi: true }
}

/** Il gesto o il salvataggio è finito: la ricarica messa da parte si applica, se il telefono è libero davvero. */
export function liberato(s: StatoRicariche, occupato: boolean): Passo {
  if (!s.messaDaParte) return { stato: s, rileggi: false }
  return chiedi(s, occupato)
}

/**
 * Un ✓, o un esito che il server ha letto ADESSO: un giorno riletto che
 * arriva prima che parta una rilettura nuova porta le posizioni di prima.
 */
export function spunta(s: StatoRicariche): StatoRicariche {
  return { ...s, dopoLaSpunta: 'da_chiedere' }
}

/**
 * Un giorno riletto è arrivato. Si applica, tranne se dopo l'ultimo ✓ non è
 * ancora partita nessuna rilettura (§5.1): allora è stato chiesto prima, non
 * si applica, e si rilegge — adesso, o finito il gesto.
 */
export function arrivata(s: StatoRicariche, occupato: boolean): Passo & { readonly applica: boolean } {
  if (s.dopoLaSpunta === 'da_chiedere') return { ...chiedi(s, occupato), applica: false }
  return { stato: { ...s, dopoLaSpunta: 'nessuna' }, rileggi: false, applica: true }
}

/** Ciò che il telefono mostra, per decidere che cosa diventa dopo la mezzanotte. */
export interface VistaMostrata {
  /** Il giorno della vista del giorno; `null` nella settimana di un'operatrice. */
  readonly giorno: string | null
  /** «Oggi» come l'ha calcolato il server disegnando la pagina. */
  readonly oggi: string
  /** L'indirizzo porta `?giorno=` (valido). */
  readonly esplicito: boolean
}

export type Cambio = { readonly tipo: 'rileggi' } | { readonly tipo: 'vai'; readonly giorno: string }

/**
 * Che cosa fa una ricarica, adesso (§4.6: al ritorno in primo piano «oggi» si
 * ricalcola; §7: il giorno è quello di Perugia).
 *
 * Il giorno mostrato cambia solo se ERA «oggi» e oggi non lo è più. Senza
 * `?giorno=` basta rileggere: la pagina ricalcola «oggi» sul server. Con
 * `?giorno=` uguale a oggi si va al giorno nuovo — scelta dichiarata: «Oggi» e
 * la striscia scrivono sempre `?giorno=`, e chi ci è tornato guarda oggi, non
 * quella data; un telefono lasciato sul bancone mostrerebbe ieri. Un altro
 * giorno scelto, e la settimana, restano dove sono.
 */
export function cambioDiGiorno(v: VistaMostrata, adesso: Date): Cambio {
  const oggi = oggiAPerugia(adesso)
  if (oggi !== v.oggi && v.esplicito && v.giorno === v.oggi) return { tipo: 'vai', giorno: oggi }
  return { tipo: 'rileggi' }
}

/**
 * I millisecondi alla prossima mezzanotte di Perugia. Non «24 ore dopo la
 * mezzanotte di oggi»: il 25 ottobre 2026 dura 25 ore e il 28 marzo 2027 23.
 *
 * La mezzanotte di Perugia è alle 22:00Z con l'ora legale e alle 23:00Z senza
 * (i cambi d'ora avvengono all'01:00Z, mai a mezzanotte): la prima delle due
 * che a Perugia è già domani.
 */
export function msAllaMezzanotte(adesso: Date): number {
  const domani = sommaGiorni(oggiAPerugia(adesso), 1)
  const utc = Date.parse(`${domani}T00:00:00Z`)
  const ora = 60 * 60 * 1000
  const mezzanotte = oggiAPerugia(new Date(utc - 2 * ora)) === domani ? utc - 2 * ora : utc - ora
  return mezzanotte - adesso.getTime()
}
