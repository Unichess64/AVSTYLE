// src/dominio/controlla.ts
//
// «Controlla» (spec 3a §4.4, D3-21; piano 3a-2 Task 9): che cosa la scheda
// mostra e fa dopo la risposta di `public.controlla_invio` (0018). La
// decisione la prende il TELEFONO, perché deve confrontare con la scheda, che
// il server non ha.
//
// ⚠︎ C1. La decisione è sulla COPPIA (riga, esito_invio), mai sulla sola riga.
// La riga 1 arriva da DUE esiti con prescrizioni OPPOSTE sulle versioni
// (spec §4.4, revisione 20, 27/09/2026):
//   — `annullato`   → versioni DI PARTENZA, mai rilette. Se una collega ha
//                     cambiato la visita, il «Salva» successivo DEVE ricevere
//                     `modificata_altrove`: è il solo modo perché nulla venga
//                     tolto in silenzio.
//   — `non_trovata` → la scheda ADOTTA lo stato letto, e con esso vale «La
//                     scheda aggiornata»: le modifiche non inviate si perdono.
// Chi decide sul solo `riga` sbaglia uno dei due, e nel verso `annullato`
// sbaglia IN SILENZIO (famiglia B5, R6-1).
//
// ⚠︎ `controlla_invio` non restituisce mai riga 3 (immagine {1,2,4,5,6,7}):
// la distinzione 2/3 la fa qui `ugualeAllaScheda`, che è la definizione di
// §4.4 — stessa data, stessa cliente, stesso insieme di appuntamenti con
// operatrice, servizio, inizio e durata — e NON guarda le versioni.
import { messaggioPerEsito } from './esiti'
import { type Scheda, ugualeAllaScheda } from './scheda'
import { type StatoVisita, leggiStatoVisita } from './stato-visita'

export type EsitoInvio = 'annullato' | 'salvata' | 'cancellata' | 'gia_cancellata'
                       | 'esiste_gia' | 'modificata_altrove' | 'cancellata_altrove' | 'non_trovata'

export interface RispostaControlla {
  readonly riga: 1 | 2 | 4 | 5 | 6 | 7
  readonly esito_invio: EsitoInvio
  readonly stato: StatoVisita | null
}

/** Ciò che la rotta `POST /api/controlla` restituisce al telefono. */
export type RispostaDellaRotta = ({ readonly tipo: 'riga' } & RispostaControlla) | { readonly tipo: 'non_so' }

// «sposta» e «annulla» sono gli invii del trascinamento (Task 10): servono agli
// invii pendenti e alla loro frase. `decidiControlla` non li vede mai: per il
// gesto la decisione è di `messaggioDiSpostamento` e `messaggioDiAnnulla`.
export type Invio = 'salva' | 'elimina' | 'togli' | 'sposta' | 'annulla'

export type Decisione = {
  readonly testo: string
  readonly spunta: boolean
  readonly versioni: 'partenza' | 'lette'      // ⚠︎ C1: dipende dall'ESITO, non dalla riga
  readonly schedaAdottaStato: boolean
  readonly riaccende: Invio | null
  readonly offreCreaDiNuovo: boolean
  readonly ricaricaIlGiorno: boolean
  readonly errore: boolean
}

export const NON_RISULTA = 'Non risulta salvata: l’invio non ha scritto nulla'
export const RISULTA_SALVATA = '✓ Risulta salvata'
export const DIVERSA = 'È diversa da come l’avevi lasciata: ecco com’è ora'
export const CANCELLATA_DOPO = 'È stata cancellata dopo il salvataggio'
export const RISULTA_CANCELLATA = '✓ Risulta cancellata'
export const NON_SO = 'Non so se è stata salvata'

const RIGHE: ReadonlySet<number> = new Set([1, 2, 4, 5, 6, 7])
const ESITI: ReadonlySet<string> = new Set([
  'annullato', 'salvata', 'cancellata', 'gia_cancellata', 'esiste_gia', 'modificata_altrove', 'cancellata_altrove', 'non_trovata',
])

/** Il documento di `controlla_invio`, controllato: una forma storta solleva, e chi chiama la tratta come «Non so». */
export function leggiRispostaControlla(d: unknown): RispostaControlla {
  const r = d as Record<string, unknown> | null
  if (typeof r !== 'object' || r === null || typeof r.riga !== 'number' || !RIGHE.has(r.riga)) {
    throw new TypeError('controlla_invio: riga inattesa')
  }
  if (typeof r.esito_invio !== 'string' || !ESITI.has(r.esito_invio)) throw new TypeError('controlla_invio: esito inatteso')
  return {
    riga: r.riga as RispostaControlla['riga'],
    esito_invio: r.esito_invio as EsitoInvio,
    stato: leggiStatoVisita(r.stato ?? null),
  }
}

const base: Decisione = {
  testo: '',
  spunta: false,
  versioni: 'partenza',
  schedaAdottaStato: false,
  riaccende: null,
  offreCreaDiNuovo: false,
  ricaricaIlGiorno: false,
  errore: false,
}

/** Righe 2 e 3: la visita c'è, e lo stato letto decide. */
function uguale_o_diversa(scheda: Scheda, stato: StatoVisita): Decisione {
  return ugualeAllaScheda(scheda, stato)
    ? { ...base, testo: RISULTA_SALVATA, spunta: true, versioni: 'lette' }
    : { ...base, testo: DIVERSA, schedaAdottaStato: true, versioni: 'lette' }
}

/** La visita non si legge: si chiude e il giorno si rilegge. */
const sparita = (testo: string, errore = false): Decisione => ({ ...base, testo, ricaricaIlGiorno: true, errore, versioni: 'lette' })

/**
 * `scheda` è ciò che l'invio ha MANDATO: per «Salva» e «Togli» la bozza
 * inviata, per «Elimina visita» la scheda letta (id, versione e attesi
 * vengono da lì).
 */
export function decidiControlla(r: RispostaControlla, scheda: Scheda, invio: Invio): Decisione {
  switch (r.riga) {
    case 1:
      // ⚠︎ C1: QUI la coppia si apre sull'esito, e non si semplifica.
      if (r.esito_invio === 'non_trovata') {
        // La lettura ha trovato la visita: è lì, e si adotta (§4.4, regole comuni).
        return { ...base, testo: NON_RISULTA, schedaAdottaStato: r.stato !== null, versioni: 'lette' }
      }
      if (invio === 'elimina') {
        // §4.4, «Elimina visita» incerta: lo dice la lettura, mai la memoria.
        if (r.stato === null) return sparita('È stata cancellata nel frattempo')
        if (!ugualeAllaScheda(scheda, r.stato)) return { ...base, testo: NON_RISULTA, schedaAdottaStato: true, versioni: 'lette' }
      }
      // `annullato`: le versioni di PARTENZA, e si riaccende lo stesso invio.
      return { ...base, testo: NON_RISULTA, versioni: 'partenza', riaccende: invio }

    case 2:
      if (r.stato === null) return sparita('Questa visita non esiste più')
      return uguale_o_diversa(scheda, r.stato)

    case 4:
      if (r.esito_invio === 'salvata') {
        // «Crea di nuovo» solo se la cliente esiste ancora; senza offerta non
        // resta niente da fare nella scheda.
        const offre = scheda.clienteEsisteAncora
        return { ...base, testo: CANCELLATA_DOPO, offreCreaDiNuovo: offre, ricaricaIlGiorno: !offre, versioni: 'lette' }
      }
      // `non_trovata` fra le cancellate: nessun salvataggio da affermare.
      return sparita('La visita è stata cancellata')

    case 5:
      if (r.esito_invio === 'non_trovata') return sparita('Questa visita non esiste più')
      // `salvata` e visita sparita senza passare dalla tabella: non deve accadere.
      return sparita('Non ritrovo questa visita: ricarico il giorno', true)

    case 6:
      switch (r.esito_invio) {
        case 'esiste_gia':
          // §4.4: si rilegge e si mostra come riga 2 o 3; sparita, vale come 4 o 5,
          // che senza la tabella delle cancellate non si separano: si dice
          // l'assenza, come la risposta diretta (Task 8), e il giorno si rilegge.
          return r.stato === null ? sparita(messaggioPerEsito('cancellata_altrove', false).testo) : uguale_o_diversa(scheda, r.stato)
        case 'modificata_altrove':
          // «La scheda aggiornata»: senza, il «Salva» dopo toglierebbe il lavoro della collega.
          return r.stato === null
            ? sparita('Questa visita non esiste più')
            : { ...base, testo: DIVERSA, schedaAdottaStato: true, versioni: 'lette' }
        case 'cancellata_altrove':
        case 'gia_cancellata':
          // Lo STESSO messaggio della risposta diretta (§4.4, riga 6).
          return sparita(messaggioPerEsito(r.esito_invio, false).testo)
        default:
          return sparita('Non ritrovo questa visita: ricarico il giorno', true)
      }

    case 7:
      return { ...base, testo: RISULTA_CANCELLATA, spunta: true, versioni: 'lette' }
  }
}

/**
 * «Crea di nuovo» (§4.4, regole comuni): id NUOVI per la visita e per gli
 * appuntamenti — riusare quello della visita darebbe `cancellata_altrove` per
 * sempre —, la cliente come esistente, e ciò che l'operatrice aveva scritto.
 * Il codice d'invio nuovo lo genera l'invio.
 */
export function schedaPerCreaDiNuovo(scheda: Scheda): Scheda {
  return {
    ...scheda,
    visitaId: crypto.randomUUID(),
    modo: 'creazione',
    cliente: scheda.cliente === null ? null : { tipo: 'esistente', id: scheda.cliente.id },
    servizi: scheda.servizi.map((s) => ({ ...s, id: crypto.randomUUID(), nuovo: true })),
    versioneVisita: null,
    attesi: [],
  }
}
