// src/cliente/richieste-scheda.ts
//
// Le letture della scheda dal telefono: una `fetch` in POST verso
// `/api/scheda`, fuori dalla fila delle Server Actions (spec 3a §4.4, §5.1).
// Il testo cercato viaggia nel CORPO, mai nell'indirizzo (§4.8).
//
// E «Controlla» (Task 9), in POST verso `/api/controlla`: anche lui fuori
// dalla fila, perché deve rispondere mentre l'invio che diagnostica è appeso.
import { type RispostaDellaRotta, leggiRispostaControlla } from '../dominio/controlla'
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
  /** «Controlla»: la riga di §4.4, oppure «Non so». Solleva `UscitaForzata` su 401. */
  controlla(codice: string, visitaId: string): Promise<RispostaDellaRotta>
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

/**
 * «Controlla» dal telefono. Un guasto di rete, un 503 o una risposta di forma
 * storta sono «Non so» (§4.4: un «Controlla» fallito non brucia niente e non
 * afferma niente). `keepalive` per l'abbandono della pagina (§4.4 punto 2).
 */
export async function controllaInvio(codice: string, visitaId: string, keepalive = false): Promise<RispostaDellaRotta> {
  let risposta: Response
  try {
    risposta = await fetch('/api/controlla', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codice, visitaId }),
      cache: 'no-store',
      keepalive,
    })
  } catch {
    return { tipo: 'non_so' }
  }
  if (risposta.status === 401) throw new UscitaForzata()
  try {
    const corpo = (await risposta.json()) as { tipo?: unknown }
    if (risposta.ok && corpo.tipo === 'riga') return { tipo: 'riga', ...leggiRispostaControlla(corpo) }
  } catch {
    // forma storta: «Non so»
  }
  return { tipo: 'non_so' }
}

export const richiesteVere: RichiesteScheda = {
  apri: (data, visitaId) => chiedi({ tipo: 'apri', data, visitaId }),
  giorno: (data) => chiedi({ tipo: 'giorno', data }),
  cerca: (testo) => chiedi({ tipo: 'cerca', testo }),
  doppioni: (nome, telefono) => chiedi({ tipo: 'doppioni', nome, telefono }),
  controlla: (codice, visitaId) => controllaInvio(codice, visitaId),
}
