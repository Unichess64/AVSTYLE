// I tipi condivisi del dominio. Spec §5, §6.5, §7.4.

/** Un indice di cella identifica un blocco di cinque minuti: 0–287. Spec §5. */
export type IndiceCella = number

/** Un indice di confine identifica un istante fra due blocchi: 0–288. Spec §5. */
export type IndiceConfine = number

/**
 * Una fascia di disponibilità, `[startBoundary, endBoundary)`, fine esclusa.
 * I nomi dei campi sono quelli delle colonne di `weekly_availability` e di
 * `exception_range` (migrazione 0006), quindi restano in inglese.
 */
export interface Fascia {
  readonly startBoundary: IndiceConfine
  readonly endBoundary: IndiceConfine
}

/**
 * Un blocco occupato da un appuntamento.
 *
 * Spec §7.4: `occupancy` porta BLOCCHI e non celle nude, perché la regola del
 * tempo di riassetto (§7.3) ha bisogno della pausa dell'appuntamento che
 * PRECEDE, e un insieme piatto di celle prese non può fornirla.
 *
 * `endCell` è l'ULTIMA CELLA OCCUPATA, INCLUSA (decisione D2-1): si costruisce
 * con `blocco()`, che è l'unico posto in TypeScript dove quel numero viene
 * calcolato. In SQL la stessa somma vive anche nella funzione del trigger di
 * `0005_occupancy.sql`, che riempie `appointment_slot`: le due vanno tenute
 * d'accordo.
 */
export interface Blocco {
  readonly appointmentId: string
  readonly startCell: IndiceCella
  readonly endCell: IndiceCella
  readonly bufferAfterCells: number
}

/** Spec §7.4. Valori congelati dalla spec: restano in inglese. */
export type StatoGiorno = 'open' | 'salon_closed' | 'operator_off'

/**
 * I quattro codici di motivo di spec §7.4: aperto ma pieno, salone chiuso,
 * operatrice assente, servizio più lungo di qualunque fascia. Al telefono sono
 * quattro frasi diverse.
 */
export type MotivoAssenza = 'full' | 'salon_closed' | 'operator_off' | 'service_too_long'
