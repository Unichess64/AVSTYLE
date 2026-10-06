// src/server/involucro.ts
//
// §4.2: «Un involucro UNICO attorno a ogni Server Action cattura ogni errore e
// restituisce solo esito e codice». §4.9: nei log solo `code` e `id`, MAI
// `details` né `hint` — un vincolo come client_birthday_real porterebbe nel
// log la riga rifiutata, cioè nome e compleanno di una cliente.
//
// ⚠︎ Il soggetto è un ARGOMENTO, non una deduzione: è C2. `avvolgi('invio', …)`
// e `avvolgi('controlla', …)` non sono la stessa funzione con un codice
// diverso, sono due politiche opposte, e la differenza la fa `classifica`.
import { type Classe, type Soggetto, classifica } from '../dominio/errori'

export async function avvolgi<T>(
  soggetto: Soggetto,
  id: string,
  corpo: () => Promise<T>,
): Promise<T | Classe> {
  try {
    return await corpo()
  } catch (e) {
    const code = sqlstateDi(e)
    // Testi fissi: la prova statica dei log ammette solo letterali (§4.9).
    if (soggetto === 'invio') console.error('invio: guasto', { code: code ?? 'nessuno', id })
    else console.error('controlla: guasto', { code: code ?? 'nessuno', id })
    return classifica(soggetto, { sqlstate: code })
  }
}

export function sqlstateDi(e: unknown): string | null {
  // PostgREST mette il SQLSTATE in `code`. Un 500 generico e un PGRST… NON ne
  // hanno uno, ed è la distinzione su cui §4.3 passo 8 è costruito.
  const c = (e as { code?: unknown } | null)?.code
  return typeof c === 'string' && /^[0-9A-Z]{5}$/.test(c) ? c : null
}
