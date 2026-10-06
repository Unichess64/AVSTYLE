// src/dominio/ritentativi.ts
//
// §4.3 passo 5. Fino a 3 ritentativi, dentro la stessa Server Action, con lo
// stesso codice d'invio, PRIMA di rispondere. Non è un «Riprova» dell'utente:
// D3-21 ha scartato la ripetizione automatica alla cieca, e questa non lo è —
// un 40P01 prova che la transazione è stata ANNULLATA per intero, quindi
// rifarla non può scrivere due volte.
//
// ⚠︎ Si ritenta SOLO su 40P01. Un guasto senza SQLSTATE potrebbe essere una
// risposta persa dopo un COMMIT riuscito: ritentarlo scriverebbe due volte, ed
// è il caso per cui «Controlla» esiste.
//
// Il codice d'invio non nasce qui e non si tocca qui: è argomento della
// `chiamata`, deciso dal chiamante PRIMA di entrare, ed è così che resta lo
// stesso a ogni tentativo.

export interface PoliticaRitentativi {
  readonly massimo: number
  /** `caso` in [0,1): lo passa il chiamante, così la prova è deterministica. */
  readonly attesaMs: (tentativo: number, caso: number) => number
}

// [proposta] 50–150, 100–300, 200–600 ms. Piccole accanto al secondo di
// deadlock_timeout che ogni 40P01 costa comunque, e casuali perché due
// scrittori che ritentassero all'unisono rifarebbero lo stesso incrocio.
export const POLITICA: PoliticaRitentativi = {
  massimo: 3,
  attesaMs: (tentativo, caso) => {
    const base = 50 * 2 ** tentativo
    return Math.round(base + caso * base * 2)
  },
}

export async function conRitentativi<T>(
  chiamata: (tentativo: number) => Promise<T>,
  estraiSqlstate: (e: unknown) => string | null,
  dormi: (ms: number) => Promise<void>,
  caso: () => number,
  // Il tetto di tempo. La quinta decisione è presa (06/10/2026, opzione b): il
  // chiamante passa 7 s (`scrittura-visita.ts`). Il predefinito resta
  // `Infinity`, che la prova 10b del Task 4 presidia.
  scadenzaMs: number = Infinity,
  adesso: () => number = Date.now,
): Promise<{ valore: T; tentativi: number }> {
  const inizio = adesso()
  let ultimo: unknown
  for (let tentativo = 0; tentativo <= POLITICA.massimo; tentativo += 1) {
    try {
      return { valore: await chiamata(tentativo), tentativi: tentativo + 1 }
    } catch (e) {
      ultimo = e
      if (estraiSqlstate(e) !== '40P01' || tentativo === POLITICA.massimo) throw e
      if (adesso() - inizio >= scadenzaMs) throw e
      await dormi(POLITICA.attesaMs(tentativo, caso()))
    }
  }
  // Irraggiungibile: l'ultima iterazione o ritorna o solleva. Sta qui perché
  // TypeScript vuole il flusso completo.
  throw ultimo
}
