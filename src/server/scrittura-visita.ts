// src/server/scrittura-visita.ts
//
// Il CORPO delle Server Actions di scrittura: «Salva», «Togli», «Elimina
// visita» (spec 3a §4.3, piano 3a-2 Task 8). Prende il client come argomento:
// il guscio `'use server'` (`azioni-visita.ts`) gli passa quello di
// `clientServer()`, le prove uno con il token. Le iniezioni di prova
// (`spiaTentativi`, `dormi`, `caso`) sono opzioni di QUESTE funzioni e mai
// argomenti della Server Action esposta.
//
// Gli otto passi di §4.3, nell'ordine, e nessuno saltato:
//   1. account attivo — se no, l'uscita forzata;
//   2. validazione di dominio (`validaScheda`): ciò che non passa non arriva
//      alla funzione, e non apre nemmeno un invio;
//   3. controllo preventivo dei conflitti e degli avvisi, sul giorno letto
//      ADESSO con `leggiDatiGiorno`: una chiave non confermata → `da_confermare`
//      senza chiamare la funzione (D3-19);
//   4. la funzione;
//   5. 40P01 → `conRitentativi`, con LO STESSO codice d'invio (C5): il codice
//      è un argomento deciso dal telefono, fuori dal ciclo;
//   6. 23505 per NOME del vincolo, 23503 con la sua frase;
//   7. ricontrollo dell'account secondo `serveRicontrolloAccount`, PRIMA di
//      scegliere il messaggio e prima che la scheda adotti lo stato;
//   8. ogni altro errore all'involucro: con SQLSTATE l'invio è annullato, senza
//      è «Non so» (C2).
//
// ⚠︎ Un guasto PRIMA del passo 4 (identità non verificabile, giorno non
// leggibile) dà «riprova», non «Non so»: la funzione non è stata chiamata e
// nessun invio è partito, quindi l'incertezza sarebbe falsa.
import type { SupabaseClient } from '@supabase/supabase-js'
import { type Atteso, proiettaAttesi } from '../dominio/attesi'
import { type Classe, RIPROVA, messaggioPerAnnullato } from '../dominio/errori'
import { type Esito, type Messaggio, messaggioPerEsito, serveRicontrolloAccount } from '../dominio/esiti'
import { conRitentativi } from '../dominio/ritentativi'
import { type SchedaSerializzata, appuntamentiDaInviare, ugualeAllaScheda } from '../dominio/scheda'
import { type StatoVisita, leggiStatoVisita } from '../dominio/stato-visita'
import { controlloPreventivo, validaEliminazione, validaScheda } from './controllo-preventivo'
import { avvolgi, sqlstateDi } from './involucro'
import { leggiDatiGiorno, leggiStato } from './lettura-scheda'
import { NonAutenticata, NonOperatrice, operatriceCorrente } from './supabase'

export type Risposta =
  | {
      readonly tipo: 'esito'
      readonly esito: Esito
      readonly messaggio: Messaggio
      readonly visita?: string
      readonly appuntamenti?: readonly Atteso[]
      readonly stato?: StatoVisita | null
    }
  // `messaggio` in più rispetto al piano: porta anche che cosa fa la scheda
  // (23503 su servizio od operatrice la ricarica, 42501 ricarica il giorno).
  | { readonly tipo: 'fallita'; readonly sqlstate: string; readonly testo: string; readonly messaggio: Messaggio }
  | { readonly tipo: 'non_so' } // → «Controlla», Task 9
  | { readonly tipo: 'da_confermare'; readonly chiavi: readonly string[] }
  // `vaiA` è `null` per un conflitto fra due servizi della scheda, che
  // nell'agenda non ha un posto (revisione del Task 7, C2).
  | { readonly tipo: 'conflitto'; readonly frase: string; readonly vaiA: string | null }
  | { readonly tipo: 'uscita_forzata' }
  | { readonly tipo: 'app_aggiornata' }
  // In più rispetto al piano: il passo 2 ha fermato la scheda. Il telefono
  // tiene già spento «Salva» per gli stessi motivi, quindi qui arriva solo un
  // corpo storto.
  | { readonly tipo: 'non_valida'; readonly motivo: string }

export interface OpzioniScrittura {
  /** Chiamata all'inizio di OGNI tentativo, col suo numero (0, 1, …). */
  readonly spiaTentativi?: (tentativo: number) => void | Promise<void>
  readonly dormi?: (ms: number) => Promise<void>
  readonly caso?: () => number
}

/** Un errore della funzione, ridotto al codice e al NOME del vincolo: mai `details` né `hint` (§4.9). */
class GuastoScrittura extends Error {
  constructor(
    readonly code: string,
    readonly vincolo: string | undefined,
  ) {
    super(`scrittura fallita: ${code}`)
  }
}

const USCITA = { tipo: 'uscita_forzata' } as const

const ESITI: ReadonlySet<string> = new Set([
  'salvata', 'cancellata', 'gia_cancellata', 'esiste_gia', 'modificata_altrove', 'cancellata_altrove', 'non_trovata', 'annullato',
])

interface RispostaFunzione {
  readonly esito: Esito
  readonly visita?: string
  readonly appuntamenti?: readonly Atteso[]
  readonly stato: StatoVisita | null
}

/** Una risposta di forma storta dopo una chiamata riuscita non dice se ha scritto: solleva senza codice, cioè «Non so». */
function leggiRispostaFunzione(d: unknown): RispostaFunzione {
  const r = d as Record<string, unknown> | null
  if (typeof r !== 'object' || r === null || typeof r.esito !== 'string' || !ESITI.has(r.esito)) {
    throw new TypeError('risposta della funzione di forma inattesa')
  }
  return {
    esito: r.esito as Esito,
    visita: typeof r.visita === 'string' ? r.visita : undefined,
    appuntamenti: Array.isArray(r.appuntamenti) ? proiettaAttesi(r.appuntamenti) : undefined,
    stato: r.stato === undefined ? null : leggiStatoVisita(r.stato),
  }
}

/** Il nome del vincolo dal messaggio di PostgreSQL. Solo il nome: la riga sta in `details`, che non si legge. */
function vincoloDi(messaggio: string | undefined): string | undefined {
  return /constraint "([^"]+)"/.exec(messaggio ?? '')?.[1]
}

async function account(client: SupabaseClient): Promise<'attivo' | 'chiuso'> {
  try {
    await operatriceCorrente(client)
    return 'attivo'
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return 'chiuso'
    throw e   // un guasto non dice niente dell'account: all'involucro, che dirà «Non so»
  }
}

function fallita(sqlstate: string, m: Messaggio): Risposta {
  return { tipo: 'fallita', sqlstate, testo: m.testo, messaggio: m }
}

const MESSAGGIO_RIPROVA: Messaggio = {
  testo: RIPROVA, spunta: false, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false,
}

/** Un guasto prima della chiamata: niente è partito. */
function primaDellaScrittura(e: unknown, id: string): Risposta {
  const code = sqlstateDi(e)
  console.error('invio: guasto prima della scrittura', { code: code ?? 'nessuno', id })
  return fallita(code ?? '', MESSAGGIO_RIPROVA)
}

/** I passi 4 e 5. Il codice d'invio è in `argomenti`, deciso PRIMA del ciclo: è così che resta lo stesso. */
async function chiama(
  client: SupabaseClient,
  funzione: 'salva_visita' | 'cancella_visita',
  argomenti: Readonly<Record<string, unknown>>,
  o: OpzioniScrittura,
): Promise<RispostaFunzione> {
  const { valore } = await conRitentativi(
    async (tentativo) => {
      await o.spiaTentativi?.(tentativo)
      const r = await client.rpc(funzione, argomenti)
      if (r.error !== null) throw new GuastoScrittura(r.error.code, vincoloDi(r.error.message))
      return r.data as unknown
    },
    sqlstateDi,
    o.dormi ?? ((ms) => new Promise((fatto) => setTimeout(fatto, ms))),
    o.caso ?? Math.random,
  )
  return leggiRispostaFunzione(valore)
}

const CHIAVI_PRIMARIE: ReadonlySet<string> = new Set(['visit_pkey', 'appointment_pkey', 'client_pkey'])

/** Il passo 6, e il 42501 del passo 7. `scheda` è `null` per «Elimina visita». */
async function dopoUnErrore(
  client: SupabaseClient,
  sqlstate: string,
  vincolo: string | undefined,
  scheda: SchedaSerializzata | null,
  io: string,
  id: string,
): Promise<Risposta> {
  // Passo 7: «su 42501» (§4.3), lo stesso giudice degli esiti. Un ricontrollo
  // in guasto non cambia il fatto certo — la scrittura è annullata —: vale la
  // frase del 42501, che ricarica il giorno (revisione del Task 8, reperto 2).
  if (serveRicontrolloAccount({ sqlstate }, false)) {
    let stato: 'attivo' | 'chiuso' = 'attivo'
    try {
      stato = await account(client)
    } catch {
      console.error('invio: ricontrollo in guasto', { code: sqlstate, id })
    }
    if (stato === 'chiuso') return USCITA
  }

  if (sqlstate === '23505' && scheda !== null) {
    if (vincolo === 'appointment_slot_unique') {
      // §10.1: una collega ha scritto fra il passo 3 e il commit. Il vincolo
      // nomina una cella sola: si rifà il controllo intero, per TUTTI i conflitti.
      let giorno
      try {
        giorno = await leggiDatiGiorno(client, scheda.data, io)
      } catch (e) {
        return primaDellaScrittura(e, id)   // la scrittura è annullata: «riprova» è vero
      }
      const di_nuovo = controlloPreventivo(scheda, giorno)
      if (di_nuovo?.tipo === 'conflitto') return di_nuovo
      // La cella si è liberata prima della rilettura: la frase di
      // `messaggioPerSqlstate` per questo vincolo è vuota, perché la dà il
      // passo 3. Qui non c'è: «riprova», che è vero (revisione, reperto 3).
      console.error('invio: annullato', { code: sqlstate, id })
      return fallita(sqlstate, MESSAGGIO_RIPROVA)
    } else if (vincolo !== undefined && CHIAVI_PRIMARIE.has(vincolo)) {
      // Un invio doppio concorrente: il server NON ripete, rilegge e mostra
      // come le righe 2 o 3 di §4.4.
      return riletta(client, scheda, 'esiste_gia', id)
    }
  }

  console.error('invio: annullato', { code: sqlstate, id })
  return fallita(sqlstate, messaggioPerAnnullato(sqlstate, vincolo))
}

/** §4.4 righe 2 e 3 (e 4/5 se la visita è sparita prima della rilettura). */
async function riletta(client: SupabaseClient, scheda: SchedaSerializzata, esito: Esito, id: string): Promise<Risposta> {
  // La funzione ha già risposto: un guasto della rilettura non prova niente
  // sulla visita, che c'è e forse è proprio questa. Mai «riprova» qui: è
  // «Non so», e «Controlla» rileggerà (revisione del Task 8, reperto 1).
  let stato: StatoVisita | null
  try {
    stato = await leggiStato(client, scheda.visitaId)
  } catch (e) {
    console.error('invio: rilettura fallita', { code: sqlstateDi(e) ?? 'nessuno', id })
    return { tipo: 'non_so' }
  }
  if (stato === null) return { tipo: 'esito', esito, messaggio: messaggioPerEsito('cancellata_altrove', false) }
  const nessuno = { spunta: false, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false }
  const uguale = ugualeAllaScheda({ ...scheda, avvisiConfermati: new Set(scheda.avvisiConfermati) }, stato)
  return {
    tipo: 'esito',
    esito,
    messaggio: uguale
      ? { ...nessuno, testo: '✓ Risulta salvata', spunta: true }
      : { ...nessuno, testo: 'È diversa da come l’avevi lasciata: ecco com’è ora', schedaAdottaStato: true },
    visita: stato.visita,
    appuntamenti: proiettaAttesi(stato.appuntamenti),
    stato,
  }
}

/** Il passo 7, poi il messaggio. */
async function dopoUnEsito(
  client: SupabaseClient,
  r: RispostaFunzione,
  haFattoUpdate: boolean,
  scheda: SchedaSerializzata | null,
  id: string,
): Promise<Risposta> {
  if (serveRicontrolloAccount(r.esito, haFattoUpdate)) {
    let stato: 'attivo' | 'chiuso'
    try {
      stato = await account(client)
    } catch (e) {
      // Un ricontrollo in guasto. Un `salvata` senza UPDATE non prova niente:
      // «Non so». Ogni altro esito qui NON ha scritto, quindi «riprova» è
      // vero e la scheda resta com'era (revisione del Task 8, reperto 2).
      if (r.esito === 'salvata') throw e
      console.error('invio: ricontrollo in guasto', { code: 'nessuno', id })
      return fallita('', MESSAGGIO_RIPROVA)
    }
    if (stato === 'chiuso') return USCITA
  }
  if (r.esito === 'esiste_gia' && scheda !== null) return riletta(client, scheda, 'esiste_gia', id)

  const messaggio = messaggioPerEsito(r.esito, false)
  if (r.esito === 'modificata_altrove' && r.stato !== null) {
    // C3: gli attesi della risposta sono già proiettati e ordinati; la scheda
    // che adotta `stato` passa comunque da `adottaStato`, che li riproietta.
    return { tipo: 'esito', esito: r.esito, messaggio, visita: r.stato.visita, appuntamenti: proiettaAttesi(r.stato.appuntamenti), stato: r.stato }
  }
  if (r.esito === 'salvata') return { tipo: 'esito', esito: r.esito, messaggio, visita: r.visita, appuntamenti: r.appuntamenti }
  return { tipo: 'esito', esito: r.esito, messaggio }
}

async function corpoSalva(
  client: SupabaseClient,
  scheda: SchedaSerializzata,
  codice: string,
  o: OpzioniScrittura,
  comeTogli: boolean,
  id: string,
): Promise<Risposta> {
  // 1
  let io: string
  try {
    io = (await operatriceCorrente(client)).operatorId
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return USCITA
    return primaDellaScrittura(e, id)
  }

  // 2 — «Togli» lavora su una visita salvata, e non toglie l'ultimo servizio
  // (quello è «Elimina visita»: lo dice l'elenco non vuoto).
  const motivo = validaScheda(scheda, codice) ?? (comeTogli && scheda.modo !== 'modifica' ? 'Scheda non valida.' : null)
  if (motivo !== null) return { tipo: 'non_valida', motivo }

  // 3
  let giorno
  try {
    giorno = await leggiDatiGiorno(client, scheda.data, io)
  } catch (e) {
    return primaDellaScrittura(e, id)
  }
  const fermo = controlloPreventivo(scheda, giorno)
  if (fermo !== null) return fermo

  // 4 e 5. C3: `p_attesi` si PROIETTA e si ORDINA a ogni chiamata, qualunque
  // cosa il telefono abbia mandato.
  const c = scheda.cliente!
  const argomenti = {
    p_codice: codice,
    p_visita: scheda.visitaId,
    p_cliente: c.id,
    // ⚠︎ `salva_visita` legge `nome`, `telefono`, `mese`, `giorno` (0016:194-201).
    p_cliente_nuova:
      c.tipo === 'nuova' ? { nome: c.nome.trim(), telefono: c.telefono, mese: c.meseDiNascita, giorno: c.giornoDiNascita } : null,
    p_data: scheda.data,
    p_appuntamenti: appuntamentiDaInviare({ ...scheda, avvisiConfermati: new Set() }),
    p_visita_attesa: scheda.versioneVisita,
    p_attesi: scheda.modo === 'modifica' ? proiettaAttesi(scheda.attesi) : null,
  }
  let r: RispostaFunzione
  try {
    r = await chiama(client, 'salva_visita', argomenti, o)
  } catch (e) {
    const sqlstate = sqlstateDi(e)
    if (sqlstate === null) throw e   // 8: fuori dal database, all'involucro
    return dopoUnErrore(client, sqlstate, (e as GuastoScrittura).vincolo, scheda, io, id)
  }

  // 7. Un `salvata` senza alcun UPDATE (stato già identico) non prova che
  // l'account fosse ancora aperto: la regola 11 non aveva righe da contare.
  // Lo si riconosce dalle versioni: se nessuna è cambiata, niente è stato scritto.
  const haFattoUpdate =
    scheda.modo === 'creazione' ||
    r.visita !== scheda.versioneVisita ||
    JSON.stringify(r.appuntamenti ?? null) !== JSON.stringify(proiettaAttesi(scheda.attesi))
  return dopoUnEsito(client, r, haFattoUpdate, scheda, id)
}

async function corpoElimina(
  client: SupabaseClient,
  visitaId: string,
  versione: string,
  attesi: readonly Atteso[],
  codice: string,
  o: OpzioniScrittura,
  id: string,
): Promise<Risposta> {
  let io: string
  try {
    io = (await operatriceCorrente(client)).operatorId
  } catch (e) {
    if (e instanceof NonAutenticata || e instanceof NonOperatrice) return USCITA
    return primaDellaScrittura(e, id)
  }
  const motivo = validaEliminazione(visitaId, versione, attesi, codice)
  if (motivo !== null) return { tipo: 'non_valida', motivo }

  // Niente passo 3: cancellare non occupa celle e non fa nascere avvisi.
  let r: RispostaFunzione
  try {
    r = await chiama(
      client,
      'cancella_visita',
      { p_codice: codice, p_visita: visitaId, p_visita_attesa: versione, p_attesi: proiettaAttesi(attesi) },
      o,
    )
  } catch (e) {
    const sqlstate = sqlstateDi(e)
    if (sqlstate === null) throw e
    return dopoUnErrore(client, sqlstate, (e as GuastoScrittura).vincolo, null, io, id)
  }
  // `cancellata` ha sempre tolto una riga: la regola 11 l'ha contata.
  return dopoUnEsito(client, r, true, null, id)
}

function inRisposta(x: Risposta | Classe): Risposta {
  if (x.tipo !== 'annullato') return x
  return fallita(x.sqlstate, messaggioPerAnnullato(x.sqlstate))
}

export async function salvaVisita(
  client: SupabaseClient,
  scheda: SchedaSerializzata,
  codice: string,
  o: OpzioniScrittura = {},
): Promise<Risposta> {
  const id = crypto.randomUUID()
  return inRisposta(await avvolgi('invio', id, () => corpoSalva(client, scheda, codice, o, false, id)))
}

/**
 * «Togli» su un servizio che non è l'ultimo (§4.4): passa da `salva_visita` con
 * TUTTA la bozza, cioè la scheda senza quel servizio e con le altre modifiche
 * non salvate (decisione dell'utente del 06/10/2026).
 */
export async function togliServizio(
  client: SupabaseClient,
  scheda: SchedaSerializzata,
  codice: string,
  o: OpzioniScrittura = {},
): Promise<Risposta> {
  const id = crypto.randomUUID()
  return inRisposta(await avvolgi('invio', id, () => corpoSalva(client, scheda, codice, o, true, id)))
}

export async function eliminaVisita(
  client: SupabaseClient,
  visitaId: string,
  versione: string,
  attesi: readonly Atteso[],
  codice: string,
  o: OpzioniScrittura = {},
): Promise<Risposta> {
  const id = crypto.randomUUID()
  return inRisposta(await avvolgi('invio', id, () => corpoElimina(client, visitaId, versione, attesi, codice, o, id)))
}
