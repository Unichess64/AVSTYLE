// src/dominio/scheda.ts
//
// Il modello della scheda visita (spec 3a §5.4, §4.4; piano 3a-2, Task 7).
// I tipi che i Task 8, 9 e 10 consumano vivono qui.
//
// Le tre cose che questo modulo non può sbagliare:
//   1. gli id si generano all'apertura con `crypto.randomUUID()`, SENZA
//      ripieghi (§4.4): un contatore o `Math.random` darebbero collisioni e
//      `esiste_gia` su una creazione;
//   2. `adottaStato` passa da `proiettaAttesi` (C3), altrimenti la scheda
//      rimbalza per sempre su `modificata_altrove`;
//   3. `ugualeAllaScheda` è la definizione di §4.4, alla lettera.
import { type Atteso, proiettaAttesi } from './attesi'
import type { StatoVisita } from './stato-visita'
import { CELLE_PER_GIORNO } from './tempo'
import { telefonoE164 } from './validazione'

export interface ClienteScelta {
  readonly tipo: 'esistente'
  readonly id: string            // uuid, l'unica cosa che viaggia
}

/**
 * ⚠︎ `salva_visita` legge `nome`, `telefono`, `mese`, `giorno`
 * (`0016:194-201`): i due campi del compleanno qui si chiamano diversamente,
 * e la traduzione è del Task 8.
 */
export interface ClienteNuova {
  readonly tipo: 'nuova'
  readonly id: string            // crypto.randomUUID(), una volta per scheda
  readonly nome: string
  readonly telefono: string | null   // già normalizzato in E.164
  readonly meseDiNascita: number | null
  readonly giornoDiNascita: number | null
}

export interface ServizioInScheda {
  readonly id: string            // uuid dell'appuntamento
  readonly nuovo: boolean        // true se l'id non esiste ancora nel database
  // ⚠︎ Mai `null`. Su un appuntamento di un'operatrice disattivata questo
  // campo CONSERVA il suo id anche se l'elenco non la mostra (D2-2): un
  // `null` qui diventa un `23502` che nessuna riprova può risolvere.
  readonly operatriceId: string
  readonly servizioId: string
  readonly inizio: number        // start_cell, 0..287
  readonly durata: number        // cell_count, ≥ 1
  readonly durataAMano: boolean  // true = non si ricalcola più (§5.4 punto 3)
  /** true = l'inizio segue la fine del precedente, pausa compresa (§5.4 punto 3). */
  readonly segueIlPrecedente: boolean
}

/** Il posto toccato nell'agenda: da lì parte il primo servizio di una scheda vuota. */
export interface Partenza {
  readonly operatriceId: string
  readonly inizio: number
}

export interface Scheda {
  readonly visitaId: string                  // crypto.randomUUID() all'apertura
  readonly modo: 'creazione' | 'modifica'
  readonly cliente: ClienteScelta | ClienteNuova | null
  readonly clienteEsisteAncora: boolean      // serve alla riga 4 di «Controlla» (Task 9)
  readonly data: string
  readonly servizi: readonly ServizioInScheda[]
  readonly versioneVisita: string | null     // null in creazione; viene da stato.visita
  readonly attesi: readonly Atteso[]         // già proiettati e ordinati
  readonly avvisiConfermati: ReadonlySet<string>
  readonly partenza: Partenza
}

// La forma che attraversa il confine client → Server Action. È `Scheda` senza
// ciò che non si serializza: `avvisiConfermati` diventa un array.
export interface SchedaSerializzata extends Omit<Scheda, 'avvisiConfermati'> {
  readonly avvisiConfermati: readonly string[]
}

/** Un appuntamento come lo vuole `p_appuntamenti` di `salva_visita` (0016). */
export interface AppuntamentoDaInviare {
  readonly id: string
  readonly operatrice: string
  readonly servizio: string
  readonly inizio: number
  readonly durata: number
}

export function apriSchedaVuota(data: string, operatriceId: string, inizio: number): Scheda {
  return {
    visitaId: crypto.randomUUID(),
    modo: 'creazione',
    cliente: null,
    clienteEsisteAncora: true,
    data,
    servizi: [],
    versioneVisita: null,
    attesi: [],
    avvisiConfermati: new Set(),
    partenza: { operatriceId, inizio },
  }
}

/** La cliente nuova, con il suo id generato qui e una volta sola. */
export function nuovaCliente(): ClienteNuova {
  return { tipo: 'nuova', id: crypto.randomUUID(), nome: '', telefono: null, meseDiNascita: null, giornoDiNascita: null }
}

/**
 * ⚠︎ `visitaId` è un argomento a parte: `stato.visita` è la VERSIONE.
 * I servizi si mostrano in ordine d'ora; gli attesi restano in ordine d'id.
 */
export function apriSchedaSuVisita(stato: StatoVisita, visitaId: string): Scheda {
  const servizi: ServizioInScheda[] = stato.appuntamenti
    .map((a) => ({
      id: a.id,
      nuovo: false,
      operatriceId: a.operatrice,
      servizioId: a.servizio,
      inizio: a.inizio,
      durata: a.durata,
      durataAMano: false,
      segueIlPrecedente: false,
    }))
    .sort((x, y) => x.inizio - y.inizio || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
  return {
    visitaId,
    modo: 'modifica',
    cliente: { tipo: 'esistente', id: stato.cliente },
    clienteEsisteAncora: true,
    data: stato.data,
    servizi,
    versioneVisita: stato.visita,
    attesi: proiettaAttesi(stato.appuntamenti),
    avvisiConfermati: new Set(),
    partenza: servizi.length > 0 ? { operatriceId: servizi[0].operatriceId, inizio: servizi[0].inizio } : { operatriceId: '', inizio: 0 },
  }
}

/**
 * §4.4, «La scheda aggiornata»: dopo un `modificata_altrove` la scheda adotta
 * lo stato corrente e BUTTA le modifiche non inviate: è la scheda riaperta,
 * con lo stesso `visitaId`. Gli attesi passano da `proiettaAttesi` (C3) dentro
 * `apriSchedaSuVisita`: lo stato ne porta sei chiavi, `p_attesi` ne vuole due.
 */
export function adottaStato(scheda: Scheda, stato: StatoVisita): Scheda {
  return apriSchedaSuVisita(stato, scheda.visitaId)
}

const idCliente = (c: Scheda['cliente']) => (c === null ? null : c.id)

/**
 * §4.4: stessa data, stessa cliente, stesso insieme di appuntamenti con, per
 * ciascuno, stessa operatrice, servizio, inizio e durata. NON guarda le
 * versioni (dicono quando, non che cosa) né `clienteEsisteAncora` (è uno
 * stato della scheda, non della visita).
 */
export function ugualeAllaScheda(scheda: Scheda, stato: StatoVisita | null): boolean {
  if (stato === null) return false
  if (scheda.data !== stato.data) return false
  // ⚠︎ un OGGETTO da una parte, un uuid nudo dall'altra
  if (idCliente(scheda.cliente) !== stato.cliente) return false
  if (scheda.servizi.length !== stato.appuntamenti.length) return false
  const perId = new Map(stato.appuntamenti.map((a) => [a.id, a]))
  return scheda.servizi.every((s) => {
    const a = perId.get(s.id)
    return (
      a !== undefined &&
      a.operatrice === s.operatriceId &&
      a.servizio === s.servizioId &&
      a.inizio === s.inizio &&
      a.durata === s.durata
    )
  })
}

/** «Togli» un servizio (§4.4): la scheda senza di lui, gli altri INTATTI. */
export function togli(scheda: Scheda, servizioId: string): Scheda {
  return { ...scheda, servizi: scheda.servizi.filter((s) => s.id !== servizioId) }
}

/**
 * Decisione dell'utente del 06/10/2026: «Togli» su un servizio che non è
 * l'ultimo manda TUTTA la bozza, e la conferma lo dice quando la bozza porta
 * altre modifiche. «Altre modifiche» = la bozza senza quel servizio differisce
 * dalla scheda LETTA (quella aperta, o adottata dopo «La scheda aggiornata»)
 * senza quel servizio, sugli stessi campi di `ugualeAllaScheda`: data, cliente,
 * e per ogni servizio operatrice, servizio, inizio e durata. Le conferme degli
 * avvisi non sono modifiche della visita.
 */
export function altreModifiche(scheda: Scheda, letta: Scheda, tolto: string): boolean {
  const bozza = togli(scheda, tolto)
  const prima = togli(letta, tolto)
  if (bozza.data !== prima.data || idCliente(bozza.cliente) !== idCliente(prima.cliente)) return true
  if (bozza.servizi.length !== prima.servizi.length) return true
  const perId = new Map(prima.servizi.map((s) => [s.id, s]))
  return !bozza.servizi.every((s) => {
    const p = perId.get(s.id)
    return (
      p !== undefined &&
      p.operatriceId === s.operatriceId &&
      p.servizioId === s.servizioId &&
      p.inizio === s.inizio &&
      p.durata === s.durata
    )
  })
}

/**
 * L'elenco COMPLETO degli appuntamenti voluti (§4.1 regola 7), operatrice
 * compresa anche per quelli di una disattivata: è il valore del modello, non
 * la selezione dell'elenco (D2-2).
 */
export function appuntamentiDaInviare(scheda: Scheda): AppuntamentoDaInviare[] {
  return scheda.servizi.map((s) => ({
    id: s.id,
    operatrice: s.operatriceId,
    servizio: s.servizioId,
    inizio: s.inizio,
    durata: s.durata,
  }))
}

/**
 * La selezione nell'elenco delle operatrici della scheda, che contiene solo le
 * attive (D2-2): `null` per una disattivata. Il modello non cambia.
 */
export function operatriceScelta(servizio: ServizioInScheda, attive: readonly string[]): string | null {
  return attive.includes(servizio.operatriceId) ? servizio.operatriceId : null
}

/**
 * D2-2: «Salva» resta spento finché un servizio appartiene a un'operatrice
 * che l'elenco non mostra. «Elimina visita» e «Togli» restano accesi.
 */
export function bloccoDelSalva(scheda: Scheda, attive: readonly string[]): string | null {
  return scheda.servizi.some((s) => operatriceScelta(s, attive) === null)
    ? 'Scegli un’operatrice attiva per questo servizio.'
    : null
}

export function serializza(scheda: Scheda): SchedaSerializzata {
  return { ...scheda, avvisiConfermati: [...scheda.avvisiConfermati].sort() }
}

/**
 * Il telefono digitato nel modulo «Nuova cliente»: E.164 con paese IT, `null`
 * se il campo è vuoto, `errato` se c'è qualcosa che non è un numero.
 */
export function telefonoDalModulo(grezzo: string): { readonly e164: string | null; readonly errato: boolean } {
  if (grezzo.trim() === '') return { e164: null, errato: false }
  try {
    return { e164: telefonoE164(grezzo), errato: false }
  } catch {
    return { e164: null, errato: true }
  }
}

const GIORNI_DEL_MESE = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Un compleanno senza anno: il 29 febbraio esiste, il 31 aprile no. Tutti e due vuoti va bene. */
export function compleannoPossibile(mese: number | null, giorno: number | null): boolean {
  if (mese === null && giorno === null) return true
  if (mese === null || giorno === null) return false
  return Number.isInteger(mese) && mese >= 1 && mese <= 12 && Number.isInteger(giorno) && giorno >= 1 && giorno <= GIORNI_DEL_MESE[mese - 1]
}

/**
 * Che cosa tiene spento «Salva», oltre a D2-2: la cliente, il suo nome, un
 * telefono scritto e non riconosciuto, un compleanno impossibile, almeno un
 * servizio, e nessun servizio oltre la mezzanotte. `telefonoErrato` viene dal
 * modulo: il modello tiene solo l'E.164, e senza questo un numero storto
 * diventava `null` in silenzio (revisione del Task 7, B1).
 */
export function cosaManca(scheda: Scheda, telefonoErrato: boolean): string | null {
  const c = scheda.cliente
  if (c === null) return 'Scegli la cliente.'
  if (c.tipo === 'nuova') {
    if (c.nome.trim() === '') return 'Scrivi il nome della cliente.'
    if (telefonoErrato) return 'Il numero di telefono non è valido.'
    if (!compleannoPossibile(c.meseDiNascita, c.giornoDiNascita)) return 'Il compleanno non esiste.'
  }
  if (scheda.servizi.length === 0) return 'Aggiungi almeno un servizio.'
  if (scheda.servizi.some((s) => s.inizio + s.durata > CELLE_PER_GIORNO)) return 'Un servizio finisce dopo mezzanotte.'
  return null
}
