// src/dominio/esiti.ts
//
// §4.1, tabella degli esiti, e §4.3 passo 7. Gli esiti arrivano come VALORE
// dalle tre funzioni di scrittura, non come errore: qui si traducono in ciò che
// l'operatrice vede e in ciò che la scheda fa.
//
// Il ✓ compare solo per `salvata`, `cancellata`, «✓ Risulta salvata» e
// «✓ Risulta cancellata» (§4.4, ultimo capoverso): le ultime due nascono con
// «Controlla», nel Task 9.

export type Esito = 'salvata' | 'cancellata' | 'gia_cancellata' | 'esiste_gia'
                  | 'modificata_altrove' | 'cancellata_altrove' | 'non_trovata' | 'annullato'

export interface Messaggio {
  readonly testo: string
  readonly spunta: boolean          // il ✓ di §4.4, ultimo capoverso
  readonly schedaAdottaStato: boolean
  readonly ricaricaIlGiorno: boolean
  readonly ricaricaLaScheda: boolean   // §4.3 passo 6, 23503 su servizio od operatrice
  /** §4.4: l'account è chiuso. Si va all'accesso, senza affermazioni sulla visita. */
  readonly uscitaForzata: boolean
}

const nessuno = {
  spunta: false, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false,
} as const

export function messaggioPerEsito(esito: Esito, accountChiuso: boolean): Messaggio {
  // §4.3 passo 7: il ricontrollo dell'account viene PRIMA della scelta del
  // messaggio e prima che la scheda adotti lo stato restituito. Un account
  // chiuso riceve `modificata_altrove` con uno stato «corrente» vuoto, e un
  // `salvata` senza UPDATE che non prova niente: nessun ✓, nessuno stato. È
  // l'uscita forzata di §4.4, senza frase: prima c'era solo un testo, e niente
  // diceva a chi chiama di far uscire l'operatrice (revisione del Task 4).
  if (accountChiuso) return { ...nessuno, testo: '', uscitaForzata: true }

  switch (esito) {
    case 'salvata':
      return { ...nessuno, testo: '✓ Salvata', spunta: true }
    case 'cancellata':
      return { ...nessuno, testo: '✓ Cancellata', spunta: true }
    case 'gia_cancellata':
      // Senza offerta di ricrearla, chiunque l'abbia cancellata.
      return { ...nessuno, testo: 'Era già stata cancellata', ricaricaIlGiorno: true }
    case 'esiste_gia':
      // Nessun messaggio: il server rilegge e mostra (§4.4).
      return { ...nessuno, testo: '' }
    case 'modificata_altrove':
      // §10.2 caso 1 e «La scheda aggiornata» di §4.4: la scheda diventa lo
      // stato corrente con le sue versioni. §4.1 non dà una frase: si mostra
      // lo stato.
      return { ...nessuno, testo: '', schedaAdottaStato: true }
    case 'cancellata_altrove':
      return { ...nessuno, testo: 'È stata cancellata da un’altra parte', ricaricaIlGiorno: true }
    case 'non_trovata':
      return { ...nessuno, testo: 'Questa visita non esiste più', ricaricaIlGiorno: true }
    case 'annullato':
      // L'invio è arrivato dopo che «Controlla» l'aveva bruciato: la risposta
      // si scarta (§4.1).
      return { ...nessuno, testo: '' }
  }
}

// ⚠︎ Prende l'ESITO oppure un SQLSTATE: §4.3 passo 7 elenca tre ingressi —
// «su `42501`, su un `salvata` che non ha eseguito alcun UPDATE, e su ogni
// esito diverso da `salvata` e `cancellata`» — e `42501` NON è un esito.
export function serveRicontrolloAccount(
  esito: Esito | { readonly sqlstate: string },
  haFattoUpdate: boolean,
): boolean {
  if (typeof esito !== 'string') return esito.sqlstate === '42501'
  if (esito === 'salvata' || esito === 'cancellata') return !haFattoUpdate
  return true
}
