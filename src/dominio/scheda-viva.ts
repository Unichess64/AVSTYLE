// src/dominio/scheda-viva.ts
//
// Il NUMERO DI GENERAZIONE della scheda (spec 3a §4.4, §8.1; piano 3a-2
// Task 9): «le risposte tardive dell'invio abbandonato si scartano».
//
// Il percorso che lo chiede: 10 s scaduti → «Non so» → «Controlla», che
// brucia il codice e risponde riga 1/`annullato` riaccendendo «Salva» con le
// versioni DI PARTENZA (C1) → POI la promessa della Server Action abbandonata
// si risolve. Senza generazione quel secondo handler riscriverebbe pulsanti,
// versioni e messaggio sopra la decisione di «Controlla».
//
// ⚠︎ `scaduto()` NON incrementa, e `controlla()` sì. Se a incrementare fosse
// lo scadere dei 10 s, la risposta di un invio ANCORA IN VOLO verrebbe
// scartata prima che «Controlla» ne abbia bruciato il codice, e l'operatrice
// vedrebbe «Non so» su un salvataggio che sta per riuscire.
//
// La scheda vera (`src/cliente/scheda-visita.tsx`) tiene questo oggetto e ne
// usa la generazione; messaggi e pulsanti li disegna React.
import type { Atteso } from './attesi'
import { type Decisione, type EsitoInvio, type Invio, NON_SO, type RispostaControlla, decidiControlla } from './controlla'
import { type Classe, messaggioPerAnnullato } from './errori'
import { type Esito, messaggioPerEsito } from './esiti'
import type { Scheda } from './scheda'
import type { StatoVisita } from './stato-visita'

export type RispostaAllaScheda =
  | { readonly tipo: 'esito'; readonly esito: Esito
      readonly visita?: string; readonly appuntamenti?: readonly Atteso[]
      readonly stato?: StatoVisita | null }
  | { readonly tipo: 'riga'; readonly riga: RispostaControlla['riga']
      readonly esito_invio: EsitoInvio; readonly stato: StatoVisita | null }
  | { readonly tipo: 'guasto'; readonly classe: Classe }

export interface SchedaViva {
  readonly generazione: number
  readonly messaggio: string
  readonly versioni: 'partenza' | 'lette'
  readonly pulsanti: { readonly salva: boolean; readonly controlla: boolean }
  /** L'ultima decisione di «Controlla», se c'è. */
  readonly decisione: Decisione | null
  /** Incrementa la generazione e restituisce quella con cui l'invio parte. */
  salva(invio?: Invio): number
  /** I 10 s di D3-9 sono scaduti. ⚠︎ NON incrementa: l'invio può ancora arrivare. */
  scaduto(): void
  /** Incrementa: da qui in poi le risposte dell'invio precedente si scartano. */
  controlla(): number
  /** `true` se `generazione` è la corrente: una risposta di prima si scarta. */
  corrente(generazione: number): boolean
  /** Scarta se `generazione` non è quella corrente. */
  applica(generazione: number, risposta: RispostaAllaScheda): void
}

export function nuovoStatoScheda(scheda: Scheda): SchedaViva {
  let generazione = 0
  let messaggio = ''
  let versioni: 'partenza' | 'lette' = 'partenza'
  let pulsanti = { salva: true, controlla: false }
  let decisione: Decisione | null = null
  let ultimo: Invio = 'salva'

  const incerto = () => {
    messaggio = NON_SO
    pulsanti = { salva: false, controlla: true }
  }

  return {
    get generazione() {
      return generazione
    },
    get messaggio() {
      return messaggio
    },
    get versioni() {
      return versioni
    },
    get pulsanti() {
      return pulsanti
    },
    get decisione() {
      return decisione
    },
    salva(invio: Invio = 'salva') {
      ultimo = invio
      generazione += 1
      pulsanti = { salva: false, controlla: false }
      return generazione
    },
    scaduto() {
      incerto()
    },
    controlla() {
      generazione += 1
      return generazione
    },
    corrente(g) {
      return g === generazione
    },
    applica(g, r) {
      if (g !== generazione) return
      switch (r.tipo) {
        case 'esito':
          messaggio = messaggioPerEsito(r.esito, false).testo
          if (r.visita !== undefined || (r.stato ?? null) !== null) versioni = 'lette'
          pulsanti = { salva: true, controlla: false }
          return
        case 'riga':
          decisione = decidiControlla(r, scheda, ultimo)
          messaggio = decisione.testo
          versioni = decisione.versioni
          pulsanti = { salva: true, controlla: false }
          return
        case 'guasto':
          if (r.classe.tipo === 'non_so') return incerto()
          if (r.classe.tipo === 'annullato') {
            messaggio = messaggioPerAnnullato(r.classe.sqlstate).testo
            pulsanti = { salva: true, controlla: false }
            return
          }
          messaggio = ''
          pulsanti = { salva: false, controlla: false }
          return
      }
    },
  }
}
