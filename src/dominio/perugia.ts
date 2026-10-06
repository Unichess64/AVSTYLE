// src/dominio/perugia.ts
//
// §7: date e ore di Europe/Rome qualunque sia il fuso del telefono. Niente qui
// legge il fuso di chi esegue: `Intl` riceve il nome del fuso per esteso, che
// è l'unico modo di leggere l'orologio di Perugia da un telefono in vacanza.
import { CELLE_PER_GIORNO, MINUTI_PER_CELLA } from './tempo'

const FUSO = 'Europe/Rome'

const PEZZI = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function leggiOrologio(adesso: Date): { data: string; ore: number; minuti: number } {
  const p = Object.fromEntries(PEZZI.formatToParts(adesso).map((x) => [x.type, x.value]))
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    ore: Number(p.hour),
    minuti: Number(p.minute),
  }
}

/** Il giorno di Perugia, in 'YYYY-MM-DD'. */
export function oggiAPerugia(adesso: Date = new Date()): string {
  return leggiOrologio(adesso).data
}

/**
 * I minuti dell'OROLOGIO, non quelli trascorsi dall'istante di mezzanotte.
 *
 * §7 lo dice con due esempi: il 25 ottobre 2026 alle 10:00 sono trascorse 11
 * ore dalla mezzanotte, e il 28 marzo 2027 ne sono trascorse 9. La linea
 * dell'ora deve stare alle 10:00 in tutti e due i giorni, quindi si legge
 * l'orologio e non si sottraggono istanti.
 */
export function minutiTrascorsiAPerugia(adesso: Date = new Date()): number {
  const { ore, minuti } = leggiOrologio(adesso)
  return ore * 60 + minuti
}

/** La posizione della linea dell'ora, in celle FRAZIONARIE (§5.1). */
export function confineDellOraAPerugia(adesso: Date = new Date()): number {
  const cella = minutiTrascorsiAPerugia(adesso) / MINUTI_PER_CELLA
  return Math.min(cella, CELLE_PER_GIORNO)
}
