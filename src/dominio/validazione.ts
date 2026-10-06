// src/dominio/validazione.ts
import parseTelefono from 'libphonenumber-js/min'
import type { DocumentoFinestra } from './finestra'
import { CELLE_PER_GIORNO, pezziData } from './tempo'

/**
 * DATE-IMPOSSIBILI. `pezziData` valida la FORMA con una regex ancorata e basta:
 * `sommaGiorni('2026-02-31', 0)` restituisce '2026-03-03', perché
 * `Date.UTC(2026, 1, 31)` trabocca in silenzio. Qui si costruisce la data e si
 * controlla che i tre pezzi tornino uguali: è l'unico modo di distinguere il
 * traboccamento senza riscrivere il calendario.
 */
export function dataReale(data: string): string {
  const [anno, mese, giorno] = pezziData(data)
  const costruita = new Date(Date.UTC(anno, mese - 1, giorno))
  if (
    costruita.getUTCFullYear() !== anno ||
    costruita.getUTCMonth() !== mese - 1 ||
    costruita.getUTCDate() !== giorno
  ) {
    throw new RangeError(`data che non esiste nel calendario: ${data}`)
  }
  return data
}

/**
 * §4.8: «la data dall'indirizzo della pagina si valida prima di usarla».
 * Non solleva: l'indirizzo lo scrive chi usa l'app, e una barra degli indirizzi
 * storta non deve dare una schermata d'errore. Ripiega su oggi.
 */
export function dataDallIndirizzo(grezza: string | null, oggi: string): string {
  if (grezza === null) return oggi
  try {
    return dataReale(grezza)
  } catch {
    return oggi
  }
}

export function telefonoE164(grezzo: string, paese: 'IT' = 'IT'): string {
  const numero = parseTelefono(grezzo, paese)
  if (numero === undefined || !numero.isValid()) {
    throw new RangeError('numero di telefono non riconosciuto')
  }
  return numero.number
}

function confineValido(c: number, dove: string): void {
  if (!Number.isInteger(c) || c < 0 || c > CELLE_PER_GIORNO) {
    throw new RangeError(`confine fuori da 0-${CELLE_PER_GIORNO} in ${dove}: ${c}`)
  }
}

function fasciaValida(da: number, a: number, dove: string): void {
  confineValido(da, dove)
  confineValido(a, dove)
  if (a <= da) throw new RangeError(`fascia che finisce prima di cominciare in ${dove}: ${da}-${a}`)
}

/**
 * I confini di una CHIUSURA sono nullabili, e lo sono INSIEME.
 *
 * ⚠︎ `salon_closure` (`0006_availability.sql:46-56`) dichiara `from_boundary` e
 * `to_boundary` come `smallint` senza `not null`, con il vincolo
 * `salon_closure_boundary_pair check ((from_boundary is null) = (to_boundary is
 * null))`: due nulli sono la GIORNATA INTERA, cioè la forma normale di una
 * chiusura — ferie, lutto, un giorno di riposo. `availability_window`
 * (`0012:100-105`) li emette grezzi, quindi arrivano come `null` in JSON.
 *
 * La prima stesura di questo piano passava quei `null` a `fasciaValida(da:
 * number, a: number)`: non compilava, e forzata a compilare avrebbe sollevato
 * su OGNI giorno coperto da una chiusura intera — cioè `leggiGiorno` avrebbe
 * mostrato una pagina d'errore al posto di un salone chiuso, a ogni
 * caricamento. Reperto bloccante della revisione del 28/09/2026.
 */
function chiusuraValida(
  da: number | null,
  a: number | null,
  dove: string,
): void {
  if (da === null || a === null) {
    // Il vincolo del database, replicato alla porta: o tutti e due o nessuno.
    if (da !== a) throw new RangeError(`chiusura con un solo confine nullo in ${dove}: ${da}-${a}`)
    return
  }
  fasciaValida(da, a, dove)
}

/**
 * CONTORNO-CERCAPOSTI, parte `decodificaFinestra`: §3.2 dice che «l'agenda è il
 * primo chiamante; valida ciò che riceve». `decodificaFinestra` non valida
 * nulla, e le sue tre trappole misurate dal piano della disponibilità —
 * operatrici duplicate che danno righe duplicate, confini fuori dominio,
 * fasce rovesciate — entrerebbero nell'agenda e uscirebbero come blocchi.
 *
 * Non si valida dentro `decodificaFinestra`: quella funzione è congelata dal
 * piano 2 e ha le sue prove. Si valida alla porta.
 */
export function validaDocumentoFinestra(d: DocumentoFinestra): DocumentoFinestra {
  for (const r of d.weekly) {
    if (!Number.isInteger(r.weekday) || r.weekday < 0 || r.weekday > 6) {
      throw new RangeError(`giorno della settimana fuori da 0-6: ${r.weekday}`)
    }
    fasciaValida(r.start_boundary, r.end_boundary, 'weekly')
  }
  for (const r of d.exceptions) {
    dataReale(r.date)
    for (const f of r.ranges) fasciaValida(f.start_boundary, f.end_boundary, 'exceptions')
  }
  for (const c of d.closures) {
    dataReale(c.start_date)
    dataReale(c.end_date)
    if (c.end_date < c.start_date) throw new RangeError('chiusura che finisce prima di cominciare')
    chiusuraValida(c.from_boundary, c.to_boundary, 'closures')
  }
  const visti = new Set<string>()
  for (const o of d.occupancy) {
    dataReale(o.date)
    if (visti.has(o.appointment_id)) {
      throw new RangeError(`occupazione ripetuta per l appuntamento ${o.appointment_id}`)
    }
    visti.add(o.appointment_id)
    // Le guardie di dominio su start_cell, cell_count e buffer le porta già
    // `blocco()`, che `decodificaFinestra` chiama: qui non si duplicano.
  }
  return d
}
