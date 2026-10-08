// src/dominio/doppi.ts — le clienti con lo stesso servizio prenotato due volte
// nella stessa settimana (richiesta del salone, 08/10): chi non conosce ancora
// i turni prenota due posti e ne terrà uno. Si mostra dalla settimana prima del
// primo dei due appuntamenti, perché qualcuno chiami la cliente e ne liberi uno.
import { giorniFra } from './avvisi'

export interface AppuntamentoDiCliente {
  readonly data: string
  readonly clienteId: string
  readonly clienteNome: string
  readonly servizioId: string
  readonly servizioNome: string
}

export interface Doppio {
  readonly clienteNome: string
  readonly servizioNome: string
  /** Le date, in ordine: almeno due, a distanza di non più di sette giorni. */
  readonly date: readonly string[]
}

export function doppiDaControllare(appuntamenti: readonly AppuntamentoDiCliente[], oggi: string): Doppio[] {
  const gruppi = new Map<string, AppuntamentoDiCliente[]>()
  for (const a of appuntamenti) {
    const k = `${a.clienteId}|${a.servizioId}`
    gruppi.set(k, [...(gruppi.get(k) ?? []), a])
  }
  const doppi: Doppio[] = []
  for (const gruppo of gruppi.values()) {
    const date = [...new Set(gruppo.map((a) => a.data))].sort()
    for (let i = 0; i < date.length - 1; i++) {
      const prima = date[i]!
      const scarto = giorniFra(oggi, prima)
      if (scarto < 0 || scarto > 7) continue                  // il primo è da oggi a fra una settimana
      const vicine = date.filter((d) => d > prima && giorniFra(prima, d) <= 7)
      if (vicine.length === 0) continue
      doppi.push({ clienteNome: gruppo[0]!.clienteNome, servizioNome: gruppo[0]!.servizioNome, date: [prima, ...vicine] })
      break                                                    // un riquadro per cliente e servizio
    }
  }
  return doppi.sort((x, y) => x.date[0]!.localeCompare(y.date[0]!) || x.clienteNome.localeCompare(y.clienteNome, 'it'))
}
