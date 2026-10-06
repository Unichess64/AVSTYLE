// src/dominio/invii-pendenti.ts
//
// Gli invii pendenti in `localStorage` (spec 3a §4.4 punto 3, §4.9; piano
// 3a-2 Task 9). È il meccanismo che regge anche su iPhone, che chiude da solo
// un'app sospesa senza avvisare la pagina: un invio è PENDENTE dal tocco alla
// risposta definitiva, e il telefono ne tiene il codice. Alla riapertura ogni
// codice dell'operatrice entrata passa da «Controlla».
//
// §4.9, l'unica eccezione dichiarata alla bozza solo in memoria: SOLO
// identificativi casuali e l'istante del tocco — pseudonimi, non anonimi —,
// nessun nome, nessun telefono, nessun orario di appuntamento. Il record si
// RICOSTRUISCE campo per campo sia scrivendo sia leggendo: una chiave in più
// non arriva mai nel telefono.
//
// Il contorno: in navigazione privata `localStorage` può mancare, sollevare a
// ogni accesso o essere pieno. Niente qui fa cadere l'app: senza deposito il
// meccanismo tace, e resta «Controlla» nella scheda aperta.
import type { Invio, RispostaControlla } from './controlla'

export const CHIAVE = 'avstyle.invii'

/**
 * 24 ore: più corte della pulizia a 30 giorni della tabella degli invii.
 * Oltre, «Controlla» su un codice già ripulito direbbe «non risulta salvato»
 * di un invio che era stato salvato: il codice si butta senza controllarlo.
 */
export const SCADENZA_MS = 24 * 60 * 60 * 1000

export interface InvioPendente {
  readonly codice: string        // crypto.randomUUID(), senza ripieghi
  readonly visitaId: string
  readonly clienteId: string | null   // solo se ESISTENTE
  readonly operatriceId: string       // chi lo ha scritto
  /** «Salva», «Togli» o «Elimina visita»: non è un dato personale, e la frase della striscia ne dipende. */
  readonly invio: Invio
  readonly toccatoIl: number          // epoch ms
}

const INVII: ReadonlySet<string> = new Set(['salva', 'togli', 'elimina'])

/**
 * I codici toccati in QUESTA pagina (revisione del Task 9). La conferma
 * all'abbandono e il «Controlla» di `pagehide` valgono solo per loro: un
 * codice lasciato da una pagina di ieri non tiene ferma l'operatrice, e uno di
 * un'altra scheda del browser, magari ancora in volo, non si brucia da qui.
 */
const toccatiQui = new Set<string>()

/** Il pezzo di `Storage` che serve. `null` quando il telefono non ne ha uno. */
export type Deposito = Pick<Storage, 'getItem' | 'setItem'> | null

/** `localStorage`, se c'è e si lascia toccare. */
export function depositoDelTelefono(): Deposito {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

const testo = (x: unknown): x is string => typeof x === 'string' && x.length > 0

/** Il record con le SOLE chiavi dichiarate, o `null` se è storto. */
function soloIdentificativi(x: unknown): InvioPendente | null {
  const r = x as Record<string, unknown> | null
  if (typeof r !== 'object' || r === null) return null
  if (!testo(r.codice) || !testo(r.visitaId) || !testo(r.operatriceId)) return null
  if (!(r.clienteId === null || testo(r.clienteId))) return null
  if (typeof r.toccatoIl !== 'number' || !Number.isFinite(r.toccatoIl)) return null
  if (typeof r.invio !== 'string' || !INVII.has(r.invio)) return null
  return {
    codice: r.codice,
    visitaId: r.visitaId,
    clienteId: r.clienteId,
    operatriceId: r.operatriceId,
    invio: r.invio as Invio,
    toccatoIl: r.toccatoIl,
  }
}

export function leggiInvii(d: Deposito): InvioPendente[] {
  if (d === null) return []
  try {
    const grezzo = JSON.parse(d.getItem(CHIAVE) ?? '[]') as unknown
    if (!Array.isArray(grezzo)) return []
    return grezzo.map(soloIdentificativi).filter((x): x is InvioPendente => x !== null)
  } catch {
    return []
  }
}

function scrivi(d: Deposito, invii: readonly InvioPendente[]): void {
  if (d === null) return
  try {
    d.setItem(CHIAVE, JSON.stringify(invii))
  } catch {
    // pieno o vietato: il meccanismo tace, e la scheda resta con «Controlla»
  }
}

/** Al TOCCO, prima che la Server Action parta. */
export function registraInvio(d: Deposito, invio: InvioPendente): void {
  const pulito = soloIdentificativi(invio)
  if (pulito === null) return
  toccatiQui.add(pulito.codice)
  scrivi(d, [...leggiInvii(d).filter((x) => x.codice !== pulito.codice), pulito])
}

/** Gli invii pendenti toccati in questa pagina e non ancora definitivi. */
export function inQuestaPagina(d: Deposito): InvioPendente[] {
  return leggiInvii(d).filter((x) => toccatiQui.has(x.codice))
}

/** Alla risposta DEFINITIVA: un esito, oppure la riga di «Controlla». */
export function togliInvio(d: Deposito, codice: string): void {
  toccatiQui.delete(codice)
  const prima = leggiInvii(d)
  const dopo = prima.filter((x) => x.codice !== codice)
  if (dopo.length !== prima.length) scrivi(d, dopo)
}

/**
 * I codici da passare da «Controlla» per l'operatrice entrata. Butta, senza
 * controllarli, i SUOI codici più vecchi di 24 ore; quelli di un'altra
 * operatrice restano lì, anche vecchi, e li giudica lei quando rientra.
 */
export function daControllare(d: Deposito, operatriceId: string, adesso: number): InvioPendente[] {
  const tutti = leggiInvii(d)
  const vivi = (x: InvioPendente) => adesso - x.toccatoIl <= SCADENZA_MS
  const tenuti = tutti.filter((x) => x.operatriceId !== operatriceId || vivi(x))
  if (tenuti.length !== tutti.length) scrivi(d, tenuti)
  return tenuti.filter((x) => x.operatriceId === operatriceId)
}

const ORA_A_PERUGIA = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/**
 * La frase della striscia. Il nome della cliente compare SOLO se letto dal
 * database (§4.4 punto 3): il record non ne porta, e senza nome si dice
 * l'ora del tocco. La bozza è persa, quindi niente distinzione 2/3: una
 * visita che c'è vuol dire «salvato».
 */
export function fraseDelPendente(invio: InvioPendente, r: RispostaControlla, nomeLetto: string | null): string {
  const ora = ORA_A_PERUGIA.format(invio.toccatoIl)
  const per = nomeLetto === null ? '' : ` per ${nomeLetto}`
  // «Elimina visita» è una cancellazione: chiamarla salvataggio confondeva.
  if (invio.invio === 'elimina' && r.riga === 1) return `La cancellazione delle ${ora}${per} non risulta fatta`
  const il = `Il salvataggio delle ${ora}${per}`
  switch (r.riga) {
    case 1:
      return `${il} non risulta salvato`
    case 2:
      return `✓ ${il} risulta salvato`
    case 4:
      return r.esito_invio === 'salvata' ? `${il} risulta salvato, ma la visita è stata cancellata dopo` : `${il} non risulta salvato: la visita è stata cancellata`
    case 5:
      return `${il} non risulta salvato: la visita non esiste più`
    case 6:
      switch (r.esito_invio) {
        case 'esiste_gia':
          return r.stato === null ? `${il}: la visita è stata cancellata` : `✓ ${il} risulta salvato`
        case 'modificata_altrove':
          return `${il} non risulta salvato: la visita era stata cambiata da un’altra parte`
        case 'gia_cancellata':
          return `La cancellazione delle ${ora}${per}: era già stata cancellata`
        default:
          return `${il} non risulta salvato: la visita è stata cancellata da un’altra parte`
      }
    case 7:
      return `✓ La cancellazione delle ${ora}${per} risulta fatta`
  }
}

/**
 * §4.4 punto 2: all'abbandono un «Controlla» per ogni invio pendente, SOLO se
 * la pagina viene davvero scartata. ⚠︎ Su iPhone `pagehide` scatta anche al
 * semplice passaggio a un'altra app (`persisted === true`): bruciare lì il
 * codice di un invio ancora in volo lo farebbe tornare `annullato`.
 */
export function alPagehide(
  persisted: boolean,
  pendenti: readonly InvioPendente[],
  manda: (codice: string, visitaId: string) => void,
): void {
  if (persisted) return
  for (const p of pendenti) manda(p.codice, p.visitaId)
}
