// src/cliente/agenda-lista.tsx
//
// L'agenda a lista (spec 3a §5.2, spec §9.2): tutti gli appuntamenti del
// giorno in ordine d'ora, con il pallino dell'operatrice, l'ora, il nome e il
// servizio. Nessun hook: si disegna sul server, come le colonne.
//
// ⚠︎ NIENTE attributi `style` (CSP di produzione): il colore va nel `fill` del
// pallino, che è un attributo SVG.
import type { AppuntamentoLetto } from '../dominio/blocchi'
import { righeDellaLista } from '../dominio/blocchi'
import { oraDaCella } from '../dominio/tempo'
import type { OperatriceInColonna } from '../server/lettura-giorno'
import stile from './agenda-lista.module.css'
import { coloriDelPallino } from './vista'

export function AgendaLista({
  appuntamenti,
  operatrici,
}: {
  appuntamenti: readonly AppuntamentoLetto[]
  operatrici: readonly OperatriceInColonna[]
}) {
  const perId = new Map(operatrici.map((o) => [o.id, o]))
  const righe = righeDellaLista(
    appuntamenti,
    operatrici.map((o) => o.id),
  )
  if (righe.length === 0) return null
  return (
    <ol className={stile.lista} aria-label="Appuntamenti del giorno, in ordine d'ora">
      {righe.map((a) => {
        const o = perId.get(a.operatriceId)
        // La lettura tiene ogni operatrice con appuntamenti: un'assente è un'incoerenza.
        if (o === undefined) throw new Error(`appuntamento senza operatrice: ${a.operatriceId}`)
        const { riempimento, bordo } = coloriDelPallino(o.colore)
        const ora = oraDaCella(a.inizio)
        return (
          <li key={a.id} className={stile.riga} aria-label={`${ora}, ${a.clienteNome}, ${a.servizioNome}, con ${o.nome}`}>
            <svg className={stile.pallino} aria-hidden="true" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="6.5" fill={riempimento} stroke={bordo} strokeWidth="1.5" />
            </svg>
            <span className={stile.ora} aria-hidden="true">
              {ora}
            </span>
            <span className={stile.testo} aria-hidden="true">
              <span className={stile.nome}>{a.clienteNome}</span>
              <span className={stile.dettaglio}>
                {a.servizioNome} · {o.nome}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
