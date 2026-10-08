'use client'
// src/cliente/settimana-tipo.tsx — l'editor della settimana tipo: un giorno alla volta.
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { oraDaConfine } from '../dominio/tempo'
import type { EsitoDisponibilita } from '../server/azioni-disponibilita'
import type { Coppia } from '../server/lettura-disponibilita'
import stile from './settimana-tipo.module.css'

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
/** Ogni 5 minuti, da 00:00 a 24:00: i confini 0–288. */
const CONFINI = Array.from({ length: 289 }, (_, i) => i)

function testoFasce(fasce: readonly Coppia[]): string {
  return fasce.length === 0 ? 'non lavora' : fasce.map(([s, e]) => `${oraDaConfine(s)}–${oraDaConfine(e)}`).join(', ')
}

export function SettimanaTipo({
  operatriceId,
  iniziale,
  salva,
}: {
  operatriceId: string
  iniziale: Coppia[][]
  salva: (operatriceId: string, giorno: number, fasce: Coppia[]) => Promise<EsitoDisponibilita>
}) {
  const router = useRouter()
  const [aperto, setAperto] = useState<number | null>(null)
  const [bozza, setBozza] = useState<Coppia[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [inviando, avvia] = useTransition()

  function apri(giorno: number) {
    setAperto(giorno)
    setBozza(iniziale[giorno]!.map(([s, e]): Coppia => [s, e]))
    setErrore(null)
  }

  function cambia(i: number, lato: 0 | 1, valore: number) {
    setBozza((b) => b.map((f, j): Coppia => (j !== i ? f : lato === 0 ? [valore, f[1]] : [f[0], valore])))
  }

  function aggiungi() {
    setBozza((b) => {
      const ultima = b[b.length - 1]
      const inizio = ultima === undefined ? 108 : Math.min(ultima[1] + 12, 276)
      return [...b, [inizio, Math.min(inizio + 48, 288)]]
    })
  }

  function conferma() {
    if (aperto === null) return
    if (bozza.some(([s, e]) => s >= e)) {
      setErrore('Una fascia finisce prima di cominciare')
      return
    }
    const giorno = aperto
    avvia(async () => {
      const esito = await salva(operatriceId, giorno, bozza)
      if (esito.ok) {
        setAperto(null)
        router.refresh()
      } else if (esito.uscita) {
        router.replace('/accesso')
      } else {
        setErrore(esito.testo)
      }
    })
  }

  return (
    <ul className={stile.giorni}>
      {GIORNI.map((nome, giorno) => (
        <li key={nome} className={stile.giorno}>
          <div className={stile.riga}>
            <span className={stile.nome}>{nome}</span>
            <span className={iniziale[giorno]!.length === 0 ? stile.riposo : stile.fasce}>
              {testoFasce(iniziale[giorno]!)}
            </span>
            {aperto !== giorno && (
              <button type="button" className={stile.modifica} onClick={() => apri(giorno)} disabled={inviando}>
                Modifica
              </button>
            )}
          </div>
          {aperto === giorno && (
            <fieldset className={stile.editor} disabled={inviando}>
              <legend className={stile.legenda}>{nome}</legend>
              {bozza.length === 0 && <p className={stile.riposo}>Non lavora.</p>}
              {bozza.map(([s, e], i) => (
                <div key={i} className={stile.fascia}>
                  <label className={stile.campo}>
                    dalle
                    <select value={s} onChange={(ev) => cambia(i, 0, Number(ev.target.value))}>
                      {CONFINI.slice(0, 288).map((c) => (
                        <option key={c} value={c}>{oraDaConfine(c)}</option>
                      ))}
                    </select>
                  </label>
                  <label className={stile.campo}>
                    alle
                    <select value={e} onChange={(ev) => cambia(i, 1, Number(ev.target.value))}>
                      {CONFINI.slice(1).map((c) => (
                        <option key={c} value={c}>{oraDaConfine(c)}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={stile.togli}
                    onClick={() => setBozza((b) => b.filter((_, j) => j !== i))}
                    aria-label={`Togli la fascia ${oraDaConfine(s)}–${oraDaConfine(e)}`}
                  >
                    Togli
                  </button>
                </div>
              ))}
              <div className={stile.azioni}>
                <button type="button" className={stile.secondario} onClick={aggiungi}>
                  Aggiungi fascia
                </button>
                {bozza.length > 0 && (
                  <button type="button" className={stile.secondario} onClick={() => setBozza([])}>
                    Non lavora
                  </button>
                )}
              </div>
              {errore !== null && (
                <p className={stile.errore} role="alert">
                  {errore}
                </p>
              )}
              <div className={stile.azioni}>
                <button type="button" className={stile.secondario} onClick={() => setAperto(null)}>
                  Annulla
                </button>
                <button type="button" className={stile.primario} onClick={conferma}>
                  {inviando ? 'Salvo…' : 'Salva'}
                </button>
              </div>
            </fieldset>
          )}
        </li>
      ))}
    </ul>
  )
}
