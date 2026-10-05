// src/dominio/errori.ts
//
// §4.3 passo 8, revisione 20. Due cose, e nessuna delle due è un elenco.
//
// 1. IL CRITERIO È PER PROPRIETÀ, NON PER ELENCO. «Un errore che arriva con un
//    SQLSTATE del database prova l'annullamento»: in PostgreSQL un errore
//    dentro una transazione la porta in stato abortito e il COMMIT successivo
//    diventa un ROLLBACK. Non esistono commit parziali, e vale anche per un
//    errore sollevato DAL commit (un vincolo differito). I sei codici qui sotto
//    NON definiscono che cosa prova l'annullamento: sono i sei che meritano un
//    messaggio PROPRIO. Un involucro che enumerasse riaprirebbe la lacuna che
//    la revisione 16 ha chiuso — misurato: `salva_visita` solleva anche 22023,
//    22P02 e 23502, e per il vecchio criterio avrebbero dato all'operatrice
//    «Non so se è stata salvata», un'incertezza FALSA su una transazione
//    certamente annullata.
//
// 2. IL SOGGETTO VIENE PRIMA DEL CODICE. Un SQLSTATE di un INVIO prova
//    l'annullamento della scrittura; un SQLSTATE di «CONTROLLA» non prova
//    niente sull'invio, che può ancora arrivare. §4.4: la risposta è SEMPRE di
//    nuovo «Non so se è stata salvata» con «Controlla» disponibile — mai «non
//    risulta», mai «riprova a salvare». ⚠︎ 55P03 (attesa sulla chiave d'invio
//    oltre lock_timeout, che la prova (c) del Task 7 del piano 3a-1 misura) NON
//    è fra i sei: applicare il criterio del punto 1 anche a «Controlla» darebbe
//    esattamente la frase vietata.

export type Soggetto = 'invio' | 'controlla'

export interface GuastoGrezzo {
  readonly sqlstate?: string | null   // il `code` che PostgREST mette in risposta
  readonly azioneMancante?: boolean   // la Server Action non esiste più: nuovo rilascio
}

export type Classe =
  | { readonly tipo: 'annullato'; readonly sqlstate: string; readonly proprio: boolean }
  | { readonly tipo: 'non_so' }
  | { readonly tipo: 'uscita_forzata' }
  | { readonly tipo: 'app_aggiornata' }

/** I sei con un messaggio PROPRIO (§4.3 passi 5, 6, 7). Non è la definizione di «annullato». */
export const SEI_CON_MESSAGGIO_PROPRIO: ReadonlySet<string> = new Set([
  '40P01', '57014', '23505', '23503', '23514', '42501',
])

export function classifica(soggetto: Soggetto, guasto: GuastoGrezzo): Classe {
  if (guasto.azioneMancante === true) return { tipo: 'app_aggiornata' }

  const sqlstate = guasto.sqlstate
  const presente = typeof sqlstate === 'string' && sqlstate.length > 0

  if (soggetto === 'controlla') {
    // §4.4: 42501 è l'uscita forzata, senza affermazioni sulla visita. Tutto il
    // resto — presente o assente — è «Non so». Non si guarda nei sei.
    if (presente && sqlstate === '42501') return { tipo: 'uscita_forzata' }
    return { tipo: 'non_so' }
  }

  if (!presente) return { tipo: 'non_so' }
  return { tipo: 'annullato', sqlstate, proprio: SEI_CON_MESSAGGIO_PROPRIO.has(sqlstate) }
}

// ---------------------------------------------------------------------------
// Le frasi di un INVIO annullato. Si chiede solo per la classe `annullato`:
// per «Controlla» le frasi le dà §4.4, non questa funzione.

const RIPROVA = 'Non sono riuscita a salvare, riprova'

// I nomi che PostgreSQL dà ai vincoli dichiarati in linea in
// `0004_visit_appointment.sql` e `0003_client.sql`.
const CLIENTE_DELLA_VISITA = 'visit_client_id_fkey'
const SERVIZIO_O_OPERATRICE: ReadonlySet<string> = new Set([
  'appointment_service_id_fkey', 'appointment_operator_id_fkey',
])
const CHIAVI_PRIMARIE: ReadonlySet<string> = new Set(['visit_pkey', 'appointment_pkey', 'client_pkey'])
const CELLA_OCCUPATA = 'appointment_slot_unique'

/**
 * La frase per l'operatrice. La stringa vuota vuol dire «la frase non nasce
 * qui»: per 23505 la ricostruisce il server, rifacendo il controllo dei
 * conflitti (passo 3) o rileggendo la visita (invio doppio, §4.4 righe 2-3).
 *
 * Su 42501 la frase vale solo con l'account ANCORA ATTIVO al ricontrollo: con
 * l'account chiuso è l'uscita forzata di §4.4, e lo decide chi chiama dopo
 * `serveRicontrolloAccount`. Il comportamento che accompagna ciascuna frase —
 * la scheda resta, si chiude, si ricarica — lo esegue il Task 8.
 */
export function messaggioPerSqlstate(sqlstate: string, nomeVincolo?: string): string {
  switch (sqlstate) {
    case '40P01':   // esauriti i ritentativi (passo 5)
    case '57014':
      return RIPROVA
    case '23503':
      if (nomeVincolo === CLIENTE_DELLA_VISITA) return 'La cliente è stata cancellata'
      if (nomeVincolo !== undefined && SERVIZIO_O_OPERATRICE.has(nomeVincolo)) {
        return 'Il servizio o l’operatrice non esiste più'
      }
      return RIPROVA
    case '23505':
      if (nomeVincolo === CELLA_OCCUPATA) return ''
      if (nomeVincolo !== undefined && CHIAVI_PRIMARIE.has(nomeVincolo)) return ''
      return RIPROVA
    // Frasi decise dall'utente il 05/10/2026: la spec non le scrive.
    case '23514':
      return 'L’orario o la durata non sono validi. Controlla la scheda e riprova.'
    case '42501':
      return 'Questa visita non è più accessibile. Ricarico il giorno.'
    default:
      // §4.3 passo 8: ogni altro SQLSTATE è un errore di programmazione che il
      // passo 2 doveva impedire. Si registra per chi sviluppa; all'operatrice
      // non serve il codice.
      return RIPROVA
  }
}
