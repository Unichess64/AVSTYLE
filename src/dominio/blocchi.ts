// Dalla lettura del giorno ai blocchi dell'agenda. Spec 3a §5.1, spec §9.1.
//
// `AppuntamentoLetto` vive qui e non in `src/server/lettura-giorno.ts`, che lo
// riesporta: il dominio non importa dal server (che porta `next/headers`), e
// `npm run test:fuso` esegue queste prove senza Next.
import { staNellaFascia } from './tempo'
import type { Fascia } from './tipi'

// ⚠︎ NESSUNA versione qui. Le versioni vengono solo da `stato_visita`:
// `appointment.updated_at` ha una forma diversa da quella di `app.versione()`,
// e un campo che somiglia a una versione senza esserlo è un invito a sbagliare
// (piano 3a-2, Task 5, decisione del 28/09).
export interface AppuntamentoLetto {
  readonly id: string
  readonly visitaId: string
  readonly operatriceId: string
  readonly servizioId: string
  readonly servizioNome: string
  readonly clienteId: string
  readonly clienteNome: string
  /** In celle da cinque minuti. */
  readonly inizio: number
  readonly durata: number
  /** `buffer_after_cells` del servizio. */
  readonly pausa: number
}

export interface BloccoAgenda {
  readonly visitaId: string
  readonly operatriceId: string
  readonly appuntamenti: readonly AppuntamentoLetto[]
  /** Confini: `fine` è esclusa ed è la fine dell'ultimo servizio, pausa esclusa. */
  readonly inizio: number
  readonly fine: number
  /** true se il blocco è TUTTA la visita: decide fra `sposta_visita_a` e `salva_visita`. */
  readonly intera: boolean
  /** Il segnino di §9.1 quando la visita è spezzata. */
  readonly segnoDiVisita: boolean
}

// Due appuntamenti della STESSA visita e della STESSA operatrice sono contigui
// quando il secondo comincia esattamente dove il primo finisce, pausa compresa:
//
//     b.inizio === a.inizio + a.durata + a.pausa
//
// spec §8.1: «"Contiguous" in §9.1 means *in sequence with only turnaround
// between*, not *cell-adjacent*». Un confronto `b.inizio === a.inizio + a.durata`
// spezzerebbe in due blocchi ogni visita con una pausa, che è il caso normale.
function contigui(a: AppuntamentoLetto, b: AppuntamentoLetto): boolean {
  return (
    a.visitaId === b.visitaId &&
    a.operatriceId === b.operatriceId &&
    b.inizio === a.inizio + a.durata + a.pausa
  )
}

const perInizio = (x: { inizio: number; operatriceId: string }, y: { inizio: number; operatriceId: string }) =>
  x.inizio - y.inizio || (x.operatriceId < y.operatriceId ? -1 : x.operatriceId > y.operatriceId ? 1 : 0)

export function componiBlocchi(appuntamenti: readonly AppuntamentoLetto[]): BloccoAgenda[] {
  const perVisita = new Map<string, AppuntamentoLetto[]>()
  for (const a of appuntamenti) {
    const gia = perVisita.get(a.visitaId) ?? []
    gia.push(a)
    perVisita.set(a.visitaId, gia)
  }

  const blocchi: BloccoAgenda[] = []
  for (const [visitaId, diVisita] of perVisita) {
    const ordinati = [...diVisita].sort((x, y) => perInizio(x, y) || (x.id < y.id ? -1 : 1))
    // Si concatena dentro ciascuna operatrice: due appuntamenti contigui nel
    // tempo ma su due colonne restano due blocchi.
    const catene: AppuntamentoLetto[][] = []
    for (const a of ordinati) {
      const catena = catene.find((c) => contigui(c[c.length - 1], a))
      if (catena) catena.push(a)
      else catene.push([a])
    }
    const intera = catene.length === 1
    for (const c of catene) {
      const ultimo = c[c.length - 1]
      blocchi.push({
        visitaId,
        operatriceId: c[0].operatriceId,
        appuntamenti: c,
        inizio: c[0].inizio,
        fine: ultimo.inizio + ultimo.durata,
        intera,
        segnoDiVisita: !intera,
      })
    }
  }
  return blocchi.sort(perInizio)
}

/** Una riga ogni mezz'ora (§9.1): sei celle. */
const MEZZORA = 6

/**
 * §9.1: la finestra parte dai confini di `salon_settings` e si ESPANDE fino a
 * contenere tutto ciò che c'è nel giorno, disponibilità e appuntamenti. Senza
 * l'espansione un appuntamento preso fuori orario (D18) sarebbe creato e mai
 * disegnato. Si allarga a mezz'ore intere, perché la griglia ha una riga ogni
 * 30 minuti; dentro i confini non si stringe mai.
 */
export function finestraVerticale(
  appuntamenti: readonly AppuntamentoLetto[],
  fasce: readonly Fascia[],
  confini: { da: number; a: number },
): { da: number; a: number } {
  let da = confini.da
  let a = confini.a
  for (const x of appuntamenti) {
    da = Math.min(da, x.inizio)
    a = Math.max(a, x.inizio + x.durata)
  }
  for (const f of fasce) {
    da = Math.min(da, f.startBoundary)
    a = Math.max(a, f.endBoundary)
  }
  if (da < confini.da) da = Math.floor(da / MEZZORA) * MEZZORA
  if (a > confini.a) a = Math.min(Math.ceil(a / MEZZORA) * MEZZORA, 288)
  return { da, a }
}

/** Un quarto d'ora: tre celle. */
const QUARTO = 3

/**
 * §5.1: il tocco su uno spazio libero apre la scheda al PIÙ TARDI fra il
 * quarto d'ora inferiore e la fine dell'appuntamento precedente nella colonna.
 * «Precedente» è uno già finito al punto del tocco: uno che comincia dopo non
 * c'entra. `colonna` sono gli appuntamenti di un'operatrice in quel giorno.
 */
export function inizioDalTocco(cella: number, colonna: readonly AppuntamentoLetto[]): number {
  let inizio = Math.floor(cella / QUARTO) * QUARTO
  for (const a of colonna) {
    const fine = a.inizio + a.durata
    if (fine <= cella && fine > inizio) inizio = fine
  }
  return inizio
}

/**
 * Gli spazi della finestra che stanno fuori da ogni fascia: le righe
 * diagonali di §5.1. `fasce` arrivano da `risolviGiorno`, già piegate e
 * ordinate.
 */
export function spaziFuoriOrario(
  fasce: readonly Fascia[],
  finestra: { da: number; a: number },
): { da: number; a: number }[] {
  const spazi: { da: number; a: number }[] = []
  let cursore = finestra.da
  for (const f of [...fasce].sort((x, y) => x.startBoundary - y.startBoundary)) {
    const da = Math.max(f.startBoundary, finestra.da)
    if (da > cursore) spazi.push({ da: cursore, a: Math.min(da, finestra.a) })
    cursore = Math.max(cursore, f.endBoundary)
  }
  if (cursore < finestra.a) spazi.push({ da: cursore, a: finestra.a })
  return spazi.filter((s) => s.a > s.da)
}

/** Un blocco è fuori orario se un suo appuntamento non sta TUTTO in una fascia (§5). */
export function bloccoFuoriOrario(b: BloccoAgenda, fasce: readonly Fascia[]): boolean {
  return b.appuntamenti.some((a) => !fasce.some((f) => staNellaFascia(a.inizio, a.durata, f)))
}
