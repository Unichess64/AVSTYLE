// src/dominio/trascinamento.ts
//
// Il trascinamento dei blocchi nell'agenda a colonne (spec 3a §5.1, D3-15;
// piano 3a-2 Task 10): il gesto, le destinazioni, che cosa mostra ogni esito,
// e la generazione PER BLOCCO. Logica pura: il componente
// (`src/cliente/trascina.tsx`) esegue soltanto.
//
// Le due cose che questo modulo non può sbagliare:
//
//   1. DOVE STA LA VISITA LO DICE LA LETTURA, MAI LA MEMORIA DEL TELEFONO
//      (§4.4, regole comuni). Dopo un esito che non ha spostato niente il blocco
//      va alla posizione LETTA — quella dello stato che il server ha riletto o
//      che «Controlla» ha letto —, non alla partenza né alla destinazione che il
//      telefono ricorda. Un blocco lasciato alla posizione ricordata è una
//      visita disegnata dove non è.
//   2. DOPO OGNI ✓ SI ADOTTANO LE VERSIONI: quelle restituite dalla scrittura,
//      o quelle rilette da «Controlla» (C3: proiettate e ordinate). Senza, il
//      trascinamento successivo della stessa visita — e «Annulla», che le
//      richiede — rimbalzerebbe su «È diversa» contro sé stesso, per sempre.
import { type Atteso, proiettaAttesi } from './attesi'
import { calcolaAvvisi } from './avvisi'
import type { AppuntamentoLetto, BloccoAgenda } from './blocchi'
import type { RispostaDellaRotta } from './controlla'
import type { Scheda } from './scheda'
import type { StatoVisita } from './stato-visita'
import { CELLE_PER_GIORNO, oraDaCella } from './tempo'
// Solo i tipi: il dominio non porta il server a tempo d'esecuzione.
import type { DatiGiorno } from '../server/lettura-scheda'
import type { Risposta } from '../server/scrittura-visita'

/** Quanto il gesto sa di un appuntamento dell'agenda: solo identificativi e celle. */
export type AppuntamentoDelGesto = Pick<
  AppuntamentoLetto,
  'id' | 'visitaId' | 'clienteId' | 'operatriceId' | 'servizioId' | 'inizio' | 'durata' | 'pausa'
>

/** Un appuntamento del blocco: dove l'agenda lo mostrava (`da`) e dove va (`a`). */
export interface Mosso {
  readonly id: string
  readonly da: number
  readonly a: number
}

/** Un appuntamento della visita come deve risultare dopo l'invio: la definizione di «uguale» di §4.4. */
export interface AppuntamentoAtteso {
  readonly id: string
  readonly operatrice: string
  readonly servizio: string
  readonly inizio: number
  readonly durata: number
}

export interface Gesto {
  readonly visitaId: string
  readonly data: string
  readonly cliente: string
  /** Gli appuntamenti del blocco trascinato. */
  readonly mossi: readonly Mosso[]
  /**
   * TUTTA la visita come deve risultare, in ordine d'id: è con lei che le
   * righe 2 e 3 di «Controlla» confrontano (§4.4: stessa data, cliente e
   * insieme di appuntamenti con operatrice, servizio, inizio e durata). La
   * collega può cambiare un servizio senza toccare l'ora.
   */
  readonly dopo: readonly AppuntamentoAtteso[]
}

const perId = (x: { id: string }, y: { id: string }) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0)

/**
 * Le destinazioni ASSOLUTE di ciascun appuntamento del blocco: lo stesso
 * scarto per tutti, quindi le pause fra un servizio e l'altro restano (§4.1).
 * Fuori dal giorno si rifiuta qui, prima di chiamare.
 */
export function destinazioni(
  blocco: BloccoAgenda<Pick<AppuntamentoLetto, 'id' | 'visitaId' | 'operatriceId' | 'inizio' | 'durata' | 'pausa'>>,
  scartoCelle: number,
): readonly { readonly id: string; readonly inizio: number }[] {
  return blocco.appuntamenti.map((a) => {
    const inizio = a.inizio + scartoCelle
    if (inizio < 0 || inizio + a.durata > CELLE_PER_GIORNO) {
      throw new RangeError(`destinazione fuori dal giorno: ${a.id}`)
    }
    return { id: a.id, inizio }
  })
}

/**
 * Il gesto da un blocco e da uno scarto. `delGiorno` sono gli appuntamenti
 * dell'agenda: quelli della stessa visita stanno tutti nello stesso giorno
 * (`0004:26-29`), quindi l'agenda conosce la visita intera.
 */
export function gestoDalBlocco(
  blocco: BloccoAgenda<AppuntamentoDelGesto>,
  delGiorno: readonly AppuntamentoDelGesto[],
  data: string,
  scartoCelle: number,
): Gesto {
  const dove = new Map(destinazioni(blocco, scartoCelle).map((d) => [d.id, d.inizio]))
  const visita = delGiorno.filter((a) => a.visitaId === blocco.visitaId)
  return {
    visitaId: blocco.visitaId,
    data,
    cliente: blocco.appuntamenti[0].clienteId,
    mossi: blocco.appuntamenti.map((a) => ({ id: a.id, da: a.inizio, a: dove.get(a.id)! })),
    dopo: visita
      .map((a) => ({ id: a.id, operatrice: a.operatriceId, servizio: a.servizioId, inizio: dove.get(a.id) ?? a.inizio, durata: a.durata }))
      .sort(perId),
  }
}

/** Il gesto non esce dalla finestra disegnata: la griglia non ha righe oltre. */
export function limitiDelloScarto(
  blocco: Pick<BloccoAgenda<AppuntamentoDelGesto>, 'inizio' | 'fine'>,
  finestra: { readonly da: number; readonly a: number },
): { readonly min: number; readonly max: number } {
  return { min: finestra.da - blocco.inizio, max: finestra.a - blocco.fine }
}

/** Solo in verticale, a passi di 5 minuti (D3-15): lo spostamento del dito in celle intere. */
export function scartoDalTrascinamento(dy: number, altezzaCella: number, limiti: { readonly min: number; readonly max: number }): number {
  const celle = Math.round(dy / altezzaCella)
  // `+ 0` toglie il -0 di `Math.round(-0,4)`: uno scarto nullo è zero.
  return Math.min(Math.max(celle, limiti.min), limiti.max) + 0
}

// ---------------------------------------------------------------------------
// Che cosa mostra ogni esito.

export interface MessaggioSpostamento {
  readonly testo: string
  readonly spunta: boolean
  /** `nuova`: dove l'operatrice l'ha messa; `letta`: dove la lettura la trova. Mai «ricordata». */
  readonly posizione: 'nuova' | 'letta' | 'sparisce'
  /** La cella d'inizio del blocco; `null` = sconosciuta, decide il giorno riletto. */
  readonly inizio: number | null
  readonly offreAnnulla: boolean
  readonly apreLaScheda: boolean
  readonly ricaricaIlGiorno: boolean
  readonly esciDallApp: boolean          // uscita_forzata
  readonly ricaricaLaPagina: boolean     // app_aggiornata
  /** «?»: il blocco resta in attesa e parte «Controlla» (§4.4). */
  readonly controlla: boolean
  /** Le versioni da adottare dopo un ✓; `null` altrimenti. */
  readonly adotta: { readonly visita: string; readonly attesi: readonly Atteso[] } | null
}

/** Ciò che arriva al gesto: la risposta della Server Action, o quella di «Controlla». */
export type RispostaAlGesto = Risposta | RispostaDellaRotta

export const NON_SPOSTATA = 'Non sono riuscita a spostarla'
export const DIVERSA = 'È diversa da come l’avevi lasciata'
export const CANCELLATA = 'La visita è stata cancellata'
export const NON_SALVATO = 'Lo spostamento non è stato salvato'
export const NON_RITROVO = 'Non ritrovo questa visita: ricarico il giorno'
export const APP_AGGIORNATA = 'L’app è stata aggiornata: ricarica la pagina.'
export const INCERTO = '?'

export const nessuno: MessaggioSpostamento = {
  testo: '',
  spunta: false,
  posizione: 'letta',
  inizio: null,
  offreAnnulla: false,
  apreLaScheda: false,
  ricaricaIlGiorno: false,
  esciDallApp: false,
  ricaricaLaPagina: false,
  controlla: false,
  adotta: null,
}

/** L'inizio del blocco dopo l'invio: la prima destinazione. */
export const inizioNuovo = (g: Gesto): number => Math.min(...g.mossi.map((m) => m.a))

/**
 * DOVE LA LETTURA TROVA IL BLOCCO: il primo dei suoi appuntamenti nello stato
 * letto. Mai la partenza né la destinazione del telefono. Senza lettura
 * (`undefined`) la posizione resta sconosciuta e decide il giorno riletto; con
 * la visita assente, o letta in un altro giorno, il blocco sparisce da qui.
 */
export function posizioneLetta(
  stato: StatoVisita | null | undefined,
  g: Gesto,
): Pick<MessaggioSpostamento, 'posizione' | 'inizio'> {
  if (stato === undefined) return { posizione: 'letta', inizio: null }
  if (stato === null || stato.data !== g.data) return { posizione: 'sparisce', inizio: null }
  return { posizione: 'letta', inizio: oraLetta(stato, g) }
}

/** La cella che la lettura dà al blocco: i suoi appuntamenti, e se non ci sono più il primo della visita. */
export function oraLetta(stato: StatoVisita, g: Gesto): number | null {
  const ids = new Set(g.mossi.map((m) => m.id))
  const suoi = stato.appuntamenti.filter((a) => ids.has(a.id))
  const da = suoi.length > 0 ? suoi : stato.appuntamenti
  return da.length === 0 ? null : Math.min(...da.map((a) => a.inizio))
}

/** §4.4, «uguale»: stessa data, stessa cliente, stesso insieme con operatrice, servizio, inizio e durata. */
export function ugualeAlGesto(stato: StatoVisita, g: Gesto): boolean {
  if (stato.data !== g.data || stato.cliente !== g.cliente) return false
  if (stato.appuntamenti.length !== g.dopo.length) return false
  const letti = new Map(stato.appuntamenti.map((a) => [a.id, a]))
  return g.dopo.every((x) => {
    const a = letti.get(x.id)
    return a !== undefined && a.operatrice === x.operatrice && a.servizio === x.servizio && a.inizio === x.inizio && a.durata === x.durata
  })
}

/** Le versioni lette da adottare (C3: proiettate e ordinate). */
export const versioniLette = (s: StatoVisita) => ({ visita: s.visita, attesi: proiettaAttesi(s.appuntamenti) })

/**
 * Le parole di un invio del gesto: lo spostamento o «Annulla». Le due tabelle
 * di §5.1 hanno la stessa forma e frasi diverse; la decisione è una sola, qui.
 */
export interface Parole {
  readonly fatto: (ora: string) => string                        // ✓
  readonly nonSalvatoPresente: (ora: string | null) => string    // riga 1, visita presente
  readonly nonSalvatoAssente: string                             // riga 1, visita assente
  readonly diversa: (oraFatta: string, oraLetta: string | null) => string   // riga 2 diversa («riga 3»)
  readonly modificata: (oraLetta: string | null) => string       // modificata_altrove, diretto o riga 6
  readonly cancellata: string                                    // cancellata_altrove, diretto o riga 6
  readonly nonTrovata: string                                    // non_trovata diretto
  readonly riga5: string                                         // visita assente e non fra le cancellate
  readonly annullato: string                                     // il codice bruciato da qualcun altro
  readonly cancellataDopo: string                                // riga 4
  readonly fallita: string                                       // 57014, 40P01 esauriti, ogni altro SQLSTATE
}

const PAROLE_DELLO_SPOSTAMENTO: Parole = {
  fatto: (ora) => `✓ Spostata alle ${ora}`,
  nonSalvatoPresente: () => NON_SALVATO,
  nonSalvatoAssente: `${NON_SALVATO}: la visita è stata cancellata`,
  diversa: () => DIVERSA,
  modificata: () => DIVERSA,
  cancellata: CANCELLATA,
  nonTrovata: CANCELLATA,
  riga5: NON_RITROVO,
  annullato: NON_SALVATO,
  cancellataDopo: CANCELLATA,
  fallita: NON_SPOSTATA,
}

/** Il messaggio di un invio del gesto, con le parole della sua tabella. */
export function messaggioDelGesto(r: RispostaAlGesto, g: Gesto, p: Parole): MessaggioSpostamento {
  const ora = (c: number | null) => (c === null ? null : oraDaCella(c))
  const fatto = (adotta: MessaggioSpostamento['adotta']): MessaggioSpostamento => ({
    ...nessuno,
    testo: p.fatto(oraDaCella(inizioNuovo(g))),
    spunta: true,
    posizione: 'nuova',
    inizio: inizioNuovo(g),
    offreAnnulla: adotta !== null,
    ricaricaIlGiorno: true,
    adotta,
  })
  const letta = (testo: string, stato: StatoVisita | null | undefined): MessaggioSpostamento => ({
    ...nessuno,
    testo,
    ...posizioneLetta(stato, g),
    ricaricaIlGiorno: true,
  })
  const sparisce = (testo: string): MessaggioSpostamento => ({ ...nessuno, testo, posizione: 'sparisce', ricaricaIlGiorno: true })
  const conOra = (stato: StatoVisita | null | undefined) =>
    stato === undefined || stato === null ? null : ora(oraLetta(stato, g))

  switch (r.tipo) {
    case 'uscita_forzata':
      // §4.4: senza affermazioni sulla visita. Il blocco non si muove e non si commenta.
      return { ...nessuno, esciDallApp: true }
    case 'app_aggiornata':
      return { ...nessuno, testo: APP_AGGIORNATA, ricaricaLaPagina: true }
    case 'non_so':
      // Il blocco resta dove l'operatrice l'ha messo, con «?», finché «Controlla» non risponde.
      return { ...nessuno, testo: INCERTO, posizione: 'nuova', inizio: inizioNuovo(g), controlla: true }
    case 'da_confermare':
    case 'conflitto':
      // Niente è stato scritto: la scheda si apre sulla posizione nuova, e
      // l'agenda torna alla lettura del giorno.
      return { ...nessuno, apreLaScheda: true, ricaricaIlGiorno: true }
    case 'non_valida':
      return letta(p.fallita, undefined)
    case 'fallita':
      // 42501 con l'account ANCORA ATTIVO: il server l'ha già ricontrollato
      // (con l'account chiuso avrebbe risposto `uscita_forzata`). Vale la sua frase.
      if (r.sqlstate === '42501') return letta(r.testo, r.stato)
      return letta(p.fallita, r.stato)
    case 'esito': {
      if (r.messaggio.uscitaForzata) return { ...nessuno, esciDallApp: true }
      switch (r.esito) {
        case 'salvata':
          return fatto(r.visita !== undefined && r.appuntamenti !== undefined ? { visita: r.visita, attesi: proiettaAttesi(r.appuntamenti) } : null)
        case 'modificata_altrove':
          return letta(p.modificata(conOra(r.stato)), r.stato ?? undefined)
        case 'cancellata_altrove':
        case 'gia_cancellata':
        case 'cancellata':
          return sparisce(p.cancellata)
        case 'non_trovata':
          return sparisce(p.nonTrovata)
        case 'annullato':
          // Il codice l'ha bruciato qualcun altro (la striscia, un'altra scheda del browser): niente è stato scritto.
          return letta(p.annullato, undefined)
        case 'esiste_gia':
          // Il gesto non crea mai: non arriva. Se arrivasse, niente è certo e decide il giorno riletto.
          return letta(p.fallita, undefined)
      }
      break
    }
    case 'riga':
      switch (r.riga) {
        case 1:
          // C1: l'esito non cambia la frase qui, ma la posizione è SEMPRE quella letta.
          if (r.stato === null) return sparisce(p.nonSalvatoAssente)
          return letta(p.nonSalvatoPresente(conOra(r.stato)), r.stato)
        case 2:
          if (r.stato === null) return sparisce(p.cancellataDopo)
          if (ugualeAlGesto(r.stato, g)) return fatto(versioniLette(r.stato))
          return letta(p.diversa(oraDaCella(inizioNuovo(g)), conOra(r.stato)), r.stato)
        case 4:
          // L12: nel trascinamento l'operatrice voleva spostare, non ricreare: nessuna offerta.
          return sparisce(p.cancellataDopo)
        case 5:
          return sparisce(p.riga5)
        case 6:
          switch (r.esito_invio) {
            case 'modificata_altrove':
              return r.stato === null ? sparisce(p.cancellata) : letta(p.modificata(conOra(r.stato)), r.stato)
            case 'esiste_gia':
              if (r.stato === null) return sparisce(p.cancellata)
              return ugualeAlGesto(r.stato, g) ? fatto(versioniLette(r.stato)) : letta(p.diversa(oraDaCella(inizioNuovo(g)), conOra(r.stato)), r.stato)
            default:
              return sparisce(p.cancellata)
          }
        case 7:
          // «Risulta cancellata» su un invio che non cancella: non deve accadere.
          return sparisce(NON_RITROVO)
      }
  }
  // Irraggiungibile: ogni ramo qui sopra ritorna. Sta qui perché TypeScript vuole il flusso completo.
  return letta(p.fallita, undefined)
}

export function messaggioDiSpostamento(r: RispostaAlGesto, g: Gesto): MessaggioSpostamento {
  return messaggioDelGesto(r, g, PAROLE_DELLO_SPOSTAMENTO)
}

// ---------------------------------------------------------------------------
// La generazione PER BLOCCO, e i tempi.

/**
 * Il numero di generazione di ciascun blocco, per visita: una risposta tardiva
 * dell'invio abbandonato si scarta, come nella scheda (`scheda-viva.ts`). Un
 * nuovo invio e «Controlla» la fanno avanzare; lo scadere dei 10 s NO, perché
 * l'invio può ancora arrivare. Un blocco che avanza non tocca gli altri: solo
 * quel blocco resta in attesa (§5.1). La chiave è la visita: due blocchi della
 * stessa visita non hanno mai due invii insieme, perché il gesto non parte su
 * una visita con un invio in corso.
 */
export interface Generazioni {
  invia(visitaId: string): number
  controlla(visitaId: string): number
  /** I 10 s sono scaduti. ⚠︎ NON fa avanzare. */
  scaduto(visitaId: string): void
  corrente(visitaId: string, generazione: number): boolean
}

export function nuoveGenerazioni(): Generazioni {
  const g = new Map<string, number>()
  const avanza = (v: string) => {
    const n = (g.get(v) ?? 0) + 1
    g.set(v, n)
    return n
  }
  return {
    invia: avanza,
    controlla: avanza,
    scaduto: () => {},
    corrente: (v, n) => (g.get(v) ?? 0) === n,
  }
}

/** D3-9: senza risposta entro 10 s dal tocco, «?». */
export const ATTESA_MS = 10_000

/**
 * I 10 s contano DAL TOCCO, non dalla partenza effettiva: un invio in fila
 * dietro un altro appeso parte dopo, ma l'operatrice aspetta da quando ha
 * lasciato il blocco (§5.1, la fila delle Server Actions).
 */
export function msAllaScadenza(toccatoIl: number, adesso: number): number {
  return Math.max(0, toccatoIl + ATTESA_MS - adesso)
}

/** [proposta] Se anche «Controlla» non risponde, l'app ritenta da sola al massimo tre volte, a distanza crescente. */
export const ATTESE_CONTROLLA_MS: readonly number[] = [2_000, 4_000, 8_000]

/** L'attesa prima del ritentativo numero `fatti` (0, 1, 2); `null` dopo il terzo: il «?» resta toccabile. */
export function prossimoControlla(fatti: number): number | null {
  return fatti < ATTESE_CONTROLLA_MS.length ? ATTESE_CONTROLLA_MS[fatti] : null
}

/**
 * La scheda aperta da un gesto che il server ha fermato (`da_confermare` o
 * conflitto): gli appuntamenti nella posizione del gesto, e gli avvisi che la
 * posizione LETTA aveva già confermati (§5.1) — sono loro che l'operatrice
 * aveva accettato. Le chiavi non dipendono dalla posizione (`avvisi.ts`).
 */
export function schedaDalGesto(
  letta: Scheda,
  sposta: readonly { readonly id: string; readonly inizio: number }[],
  giorno: Pick<DatiGiorno, 'risolti' | 'appuntamenti'>,
): Scheda {
  const giaAccettati = calcolaAvvisi({
    visitaId: letta.visitaId,
    data: letta.data,
    cliente: letta.cliente === null ? null : { id: letta.cliente.id, nome: '' },
    servizi: letta.servizi,
    giorno: { risolti: new Map(Object.entries(giorno.risolti)), appuntamenti: giorno.appuntamenti },
    nomiOperatrici: new Map(),
    nomiServizi: new Map(),
  }).map((a) => a.chiave)
  const dove = new Map(sposta.map((x) => [x.id, x.inizio]))
  return {
    ...letta,
    servizi: letta.servizi.map((x) => (dove.has(x.id) ? { ...x, inizio: dove.get(x.id)! } : x)).sort((x, y) => x.inizio - y.inizio),
    avvisiConfermati: new Set([...letta.avvisiConfermati, ...giaAccettati]),
  }
}
