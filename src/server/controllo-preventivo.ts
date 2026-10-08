// src/server/controllo-preventivo.ts
//
// I passi 2 e 3 di §4.3, come logica pura: il server li RIFÀ da sé.
//
// Passo 2 — la validazione di dominio. Il telefono tiene spento «Salva» con
// `cosaManca` e `bloccoDelSalva`, ma una Server Action si raggiunge con un POST
// diretto (§4.2): qui non ci si fida di niente, nemmeno della forma. ⚠︎ È il
// passo che impedisce che 22023, 22P02 e 23502 — i tre codici MISURATI fuori
// dall'elenco dei sei (§4.1, censimento) — nascano da ciò che l'operatrice
// digita, o da un corpo storto.
//
// Passo 3 — conflitti e avvisi, con le STESSE funzioni della scheda: escludendo
// tutti gli id in scrittura (nuovi, modificati e tolti, spec §10.1), e con gli
// avvisi ricalcolati contro le chiavi confermate (D3-19).
import { type Vicino, calcolaAvvisi, fermaIlSalvataggio } from '../dominio/avvisi'
import { fraseDeiConflitti, idInScrittura, trovaConflitti } from '../dominio/conflitti'
import { type SchedaSerializzata, compleannoPossibile } from '../dominio/scheda'
import { CELLE_PER_GIORNO } from '../dominio/tempo'
import { dataReale, telefonoE164 } from '../dominio/validazione'
import type { DatiGiorno } from './lettura-scheda'
import type { RichiestaSpostamento } from './scrittura-visita'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const uuid = (x: unknown): x is string => typeof x === 'string' && UUID.test(x)
const intero = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x)
/** Una versione è il testo di `app.versione()`: non vuoto, e corto. */
const versione = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64
const LUNGHEZZA_NOME = 120

function attesiValidi(x: unknown): boolean {
  return Array.isArray(x) && x.every((a) => typeof a === 'object' && a !== null && uuid(a.id) && versione(a.versione))
}

function dataValida(x: unknown): boolean {
  if (typeof x !== 'string') return false
  try {
    dataReale(x)
    return true
  } catch {
    return false
  }
}

/**
 * `null` se la scheda si può mandare alla funzione; altrimenti il motivo, che
 * il telefono mostra. Rifà le regole di `cosaManca` invece di chiamarla: quella
 * si fida dei tipi, e qui i tipi sono una promessa del mittente.
 */
export function validaScheda(s: SchedaSerializzata, codice: string): string | null {
  if (!uuid(codice)) return 'Codice d’invio non valido.'
  if (typeof s !== 'object' || s === null) return 'Scheda non valida.'
  if (!uuid(s.visitaId)) return 'Scheda non valida.'
  if (s.modo === 'creazione') {
    if (s.versioneVisita !== null || !Array.isArray(s.attesi) || s.attesi.length !== 0) return 'Scheda non valida.'
  } else if (s.modo === 'modifica') {
    if (!versione(s.versioneVisita) || !attesiValidi(s.attesi)) return 'Scheda non valida.'
  } else {
    return 'Scheda non valida.'
  }
  if (!Array.isArray(s.avvisiConfermati) || !s.avvisiConfermati.every((k) => typeof k === 'string')) return 'Scheda non valida.'
  if (!dataValida(s.data)) return 'La data non esiste.'

  const c = s.cliente
  if (c === null || typeof c !== 'object' || !uuid(c.id)) return 'Scegli la cliente.'
  if (c.tipo === 'nuova') {
    if (typeof c.nome !== 'string' || c.nome.trim() === '' || c.nome.trim().length > LUNGHEZZA_NOME) {
      return 'Scrivi il nome della cliente.'
    }
    if (c.telefono !== null) {
      try {
        if (typeof c.telefono !== 'string' || telefonoE164(c.telefono) !== c.telefono) return 'Il numero di telefono non è valido.'
      } catch {
        return 'Il numero di telefono non è valido.'
      }
    }
    const mese = c.meseDiNascita
    const giorno = c.giornoDiNascita
    if ((mese !== null && !intero(mese)) || (giorno !== null && !intero(giorno)) || !compleannoPossibile(mese, giorno)) {
      return 'Il compleanno non esiste.'
    }
  } else if (c.tipo !== 'esistente') {
    return 'Scegli la cliente.'
  }

  if (!Array.isArray(s.servizi) || s.servizi.length === 0) return 'Aggiungi almeno un servizio.'
  const visti = new Set<string>()
  for (const x of s.servizi) {
    if (typeof x !== 'object' || x === null || !uuid(x.id) || !uuid(x.operatriceId) || !uuid(x.servizioId)) return 'Scheda non valida.'
    if (visti.has(x.id)) return 'Scheda non valida.'
    visti.add(x.id)
    if (!intero(x.inizio) || x.inizio < 0 || x.inizio >= CELLE_PER_GIORNO) return 'L’orario non è valido.'
    if (!intero(x.durata) || x.durata < 1) return 'La durata non è valida.'
    if (x.inizio + x.durata > CELLE_PER_GIORNO) return 'Un servizio finisce dopo mezzanotte.'
  }
  return null
}

export function validaEliminazione(visitaId: string, versioneVisita: string, attesi: readonly unknown[], codice: string): string | null {
  if (!uuid(codice)) return 'Codice d’invio non valido.'
  if (!uuid(visitaId) || !versione(versioneVisita) || !attesiValidi(attesi)) return 'Scheda non valida.'
  return null
}

export type Preventivo =
  | { readonly tipo: 'conflitto'; readonly frase: string; readonly vaiA: string | null }
  | { readonly tipo: 'da_confermare'; readonly chiavi: readonly string[] }

// Le chiavi non dipendono dai nomi: il motivo lo scrive il telefono.
function avvisiDi(s: SchedaSerializzata, giorno: DatiGiorno, nomi: ReadonlyMap<string, string>, vicini?: readonly Vicino[]) {
  return calcolaAvvisi({
    vicini,
    visitaId: s.visitaId,
    data: s.data,
    cliente: s.cliente === null ? null : { id: s.cliente.id, nome: '' },
    servizi: s.servizi,
    giorno: { risolti: new Map(Object.entries(giorno.risolti)), appuntamenti: giorno.appuntamenti },
    nomiOperatrici: nomi,
    nomiServizi: new Map(),
  })
}

/**
 * Le chiavi degli avvisi di una scheda sul giorno letto. Serve al gesto
 * (§5.1): gli avvisi che la posizione di PARTENZA aveva già si passano come
 * confermati, e le chiavi non dipendono dalla posizione (`avvisi.ts`).
 */
export function chiaviDegliAvvisi(s: SchedaSerializzata, giorno: DatiGiorno): string[] {
  return avvisiDi(s, giorno, new Map(giorno.operatrici.map((o) => [o.id, o.nome]))).map((a) => a.chiave)
}

/**
 * Il passo 2 del gesto (Task 10). Come `validaScheda`, non si fida della
 * forma: il telefono manda uno scarto non nullo e dentro il giorno, ma una
 * Server Action si raggiunge con un POST diretto. Il confronto con la durata
 * (oltre la mezzanotte) lo fa il corpo, che legge la visita.
 */
export function validaSpostamento(r: RichiestaSpostamento, codice: string, versioniObbligatorie: boolean): string | null {
  if (!uuid(codice)) return 'Codice d’invio non valido.'
  if (typeof r !== 'object' || r === null || !uuid(r.visitaId) || !dataValida(r.data)) return 'Spostamento non valido.'
  if (!Array.isArray(r.mossi) || r.mossi.length === 0 || r.mossi.length > CELLE_PER_GIORNO) return 'Spostamento non valido.'
  const visti = new Set<string>()
  for (const m of r.mossi) {
    if (typeof m !== 'object' || m === null || !uuid(m.id) || visti.has(m.id)) return 'Spostamento non valido.'
    visti.add(m.id)
    for (const c of [m.da, m.a]) if (!intero(c) || c < 0 || c >= CELLE_PER_GIORNO) return 'L’orario non è valido.'
  }
  // Uno scarto di zero celle non si manda: `sposta_visita_a` alzerebbe le versioni per niente.
  if (r.mossi.every((m) => m.a === m.da)) return 'Lo spostamento è nullo.'
  const v = r.versioni
  if (v === null || v === undefined) return versioniObbligatorie ? 'Spostamento non valido.' : null
  if (typeof v !== 'object' || !versione(v.visita) || !attesiValidi(v.attesi)) return 'Spostamento non valido.'
  return null
}

/**
 * Il passo 3 sul giorno letto: prima i conflitti, che fermano sempre, poi gli
 * avvisi, che fermano solo con una chiave non confermata. `null` = si scrive.
 */
export function controlloPreventivo(s: SchedaSerializzata, giorno: DatiGiorno, vicini?: readonly Vicino[]): Preventivo | null {
  const nomi = new Map(giorno.operatrici.map((o) => [o.id, o.nome]))
  const conflitti = fraseDeiConflitti(
    trovaConflitti(s.servizi, giorno.appuntamenti, idInScrittura(s.servizi, s.attesi.map((a) => a.id)), nomi),
  )
  if (conflitti !== null) return { tipo: 'conflitto', frase: conflitti.frase, vaiA: conflitti.vaiA }

  const avvisi = avvisiDi(s, giorno, nomi, vicini)
  const confermati = new Set(s.avvisiConfermati)
  if (!fermaIlSalvataggio(avvisi, confermati)) return null
  return { tipo: 'da_confermare', chiavi: avvisi.map((a) => a.chiave).filter((k) => !confermati.has(k)) }
}
