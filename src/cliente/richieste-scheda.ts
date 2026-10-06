// src/cliente/richieste-scheda.ts
//
// Le letture della scheda dal telefono: una `fetch` in POST verso
// `/api/scheda`, fuori dalla fila delle Server Actions (spec 3a §4.4, §5.1).
// Il testo cercato viaggia nel CORPO, mai nell'indirizzo (§4.8).
import type {
  ClienteTrovata,
  DatiGiorno,
  Doppione,
  RichiestaScheda,
  RispostaApri,
} from '../server/lettura-scheda'

/** 401 dalla rotta: l'account non è più un'operatrice attiva. Si esce. */
export class UscitaForzata extends Error {}

export interface RichiesteScheda {
  apri(data: string, visitaId: string | null): Promise<RispostaApri>
  giorno(data: string): Promise<DatiGiorno>
  cerca(testo: string): Promise<ClienteTrovata[]>
  doppioni(nome: string, telefono: string | null): Promise<Doppione[]>
}

async function chiedi<T>(r: RichiestaScheda): Promise<T> {
  const risposta = await fetch('/api/scheda', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(r),
    cache: 'no-store',
  })
  if (risposta.status === 401) throw new UscitaForzata()
  if (!risposta.ok) throw new Error(`lettura della scheda fallita: ${risposta.status}`)
  return (await risposta.json()) as T
}

export const richiesteVere: RichiesteScheda = {
  apri: (data, visitaId) => chiedi({ tipo: 'apri', data, visitaId }),
  giorno: (data) => chiedi({ tipo: 'giorno', data }),
  cerca: (testo) => chiedi({ tipo: 'cerca', testo }),
  doppioni: (nome, telefono) => chiedi({ tipo: 'doppioni', nome, telefono }),
}
