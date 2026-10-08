'use client'
// src/cliente/catalogo.tsx — Impostazioni: orario del salone, categorie, servizi, chi li esegue.
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { oraDaConfine } from '../dominio/tempo'
import type { DatiServizio, EsitoImpostazioni } from '../server/azioni-impostazioni'
import type { DatiImpostazioni, Servizio } from '../server/lettura-impostazioni'
import stile from './catalogo.module.css'

interface Azioni {
  salvaOrarioSalone: (inizio: number, fine: number) => Promise<EsitoImpostazioni>
  aggiungiCategoria: (nome: string) => Promise<EsitoImpostazioni>
  cancellaCategoria: (id: string) => Promise<EsitoImpostazioni>
  salvaServizio: (s: DatiServizio) => Promise<EsitoImpostazioni>
  attivaServizio: (id: string, attivo: boolean) => Promise<EsitoImpostazioni>
  impostaEsecuzione: (servizioId: string, operatriceId: string, esegue: boolean) => Promise<EsitoImpostazioni>
}

const CONFINI = Array.from({ length: 289 }, (_, i) => i)
/** Durate da 5 minuti a 4 ore, pause da 0 a 1 ora: in celle da 5 minuti. */
const DURATE = Array.from({ length: 48 }, (_, i) => i + 1)
const PAUSE = Array.from({ length: 13 }, (_, i) => i)
const minuti = (celle: number) => `${celle * 5} min`

export function Catalogo({
  dati,
  operatrici,
  azioni,
}: {
  dati: DatiImpostazioni
  operatrici: readonly { id: string; nome: string }[]
  azioni: Azioni
}) {
  const router = useRouter()
  const [errore, setErrore] = useState<string | null>(null)
  const [inviando, avvia] = useTransition()

  /** Ogni scrittura passa di qui: un esito, poi la pagina si rilegge dal server. */
  function esegui(scrittura: () => Promise<EsitoImpostazioni>, dopo?: () => void) {
    setErrore(null)
    avvia(async () => {
      const esito = await scrittura()
      if (esito.ok) {
        dopo?.()
        router.refresh()
      } else if (esito.uscita) {
        router.replace('/accesso')
      } else {
        setErrore(esito.testo)
      }
    })
  }

  const [inizio, setInizio] = useState(dati.orario.inizio)
  const [fine, setFine] = useState(dati.orario.fine)
  const [nuovaCategoria, setNuovaCategoria] = useState('')
  const [modifica, setModifica] = useState<DatiServizio | null>(null)

  const nuovo = (): DatiServizio => ({ id: null, nome: '', categoriaId: dati.categorie[0]?.id ?? '', durata: 6, pausa: 0 })
  const daServizio = (s: Servizio): DatiServizio => ({
    id: s.id, nome: s.nome, categoriaId: s.categoriaId, durata: s.durata, pausa: s.pausa,
  })

  return (
    <div className={stile.sezioni}>
      {errore !== null && (
        <p className={stile.errore} role="alert">
          {errore}
        </p>
      )}

      <section className={stile.sezione} aria-labelledby="titolo-orario">
        <h2 id="titolo-orario" className={stile.sottotitolo}>Orario del salone</h2>
        <fieldset className={stile.riga} disabled={inviando}>
          <label className={stile.campo}>
            apre alle
            <select value={inizio} onChange={(e) => setInizio(Number(e.target.value))}>
              {CONFINI.slice(0, 288).map((c) => <option key={c} value={c}>{oraDaConfine(c)}</option>)}
            </select>
          </label>
          <label className={stile.campo}>
            chiude alle
            <select value={fine} onChange={(e) => setFine(Number(e.target.value))}>
              {CONFINI.slice(1).map((c) => <option key={c} value={c}>{oraDaConfine(c)}</option>)}
            </select>
          </label>
          <button type="button" className={stile.primario} onClick={() => esegui(() => azioni.salvaOrarioSalone(inizio, fine))}>
            Salva
          </button>
        </fieldset>
      </section>

      <section className={stile.sezione} aria-labelledby="titolo-categorie">
        <h2 id="titolo-categorie" className={stile.sottotitolo}>Categorie</h2>
        <ul className={stile.elenco}>
          {dati.categorie.map((c) => (
            <li key={c.id} className={stile.voce}>
              <span className={stile.nome}>{c.nome}</span>
              <button
                type="button"
                className={stile.secondario}
                disabled={inviando}
                onClick={() => {
                  if (window.confirm(`Cancellare la categoria «${c.nome}»?`)) esegui(() => azioni.cancellaCategoria(c.id))
                }}
              >
                Cancella
              </button>
            </li>
          ))}
        </ul>
        <fieldset className={stile.riga} disabled={inviando}>
          <label className={stile.campoLargo}>
            nuova categoria
            <input value={nuovaCategoria} onChange={(e) => setNuovaCategoria(e.target.value)} maxLength={80} />
          </label>
          <button
            type="button"
            className={stile.primario}
            onClick={() => esegui(() => azioni.aggiungiCategoria(nuovaCategoria), () => setNuovaCategoria(''))}
          >
            Aggiungi
          </button>
        </fieldset>
      </section>

      <section className={stile.sezione} aria-labelledby="titolo-servizi">
        <h2 id="titolo-servizi" className={stile.sottotitolo}>Servizi</h2>
        {dati.categorie.length === 0 && <p>Prima aggiungi una categoria.</p>}
        {dati.categorie.map((c) => {
          const servizi = dati.servizi.filter((s) => s.categoriaId === c.id)
          return (
            <div key={c.id} className={stile.gruppo}>
              <h3 className={stile.categoria}>{c.nome}</h3>
              {servizi.length === 0 && <p className={stile.nota}>Nessun servizio.</p>}
              <ul className={stile.elenco}>
                {servizi.map((s) => (
                  <li key={s.id} className={s.attivo ? stile.servizio : stile.servizioSpento}>
                    <div className={stile.voce}>
                      <span className={stile.nome}>
                        {s.nome}
                        {!s.attivo && ' (disattivato)'}
                      </span>
                      <span className={stile.nota}>
                        {minuti(s.durata)}
                        {s.pausa > 0 && ` + ${minuti(s.pausa)} di pausa`}
                      </span>
                    </div>
                    <div className={stile.chi} role="group" aria-label={`Chi esegue ${s.nome}`}>
                      {operatrici.map((o) => {
                        const esegue = s.esecutrici.includes(o.id)
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={stile.chip}
                            aria-pressed={esegue}
                            disabled={inviando}
                            onClick={() => esegui(() => azioni.impostaEsecuzione(s.id, o.id, !esegue))}
                          >
                            {o.nome}
                          </button>
                        )
                      })}
                    </div>
                    <div className={stile.azioni}>
                      <button type="button" className={stile.secondario} disabled={inviando} onClick={() => setModifica(daServizio(s))}>
                        Modifica
                      </button>
                      <button
                        type="button"
                        className={stile.secondario}
                        disabled={inviando}
                        onClick={() => esegui(() => azioni.attivaServizio(s.id, !s.attivo))}
                      >
                        {s.attivo ? 'Disattiva' : 'Riattiva'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {dati.categorie.length > 0 && modifica === null && (
          <button type="button" className={stile.primario} onClick={() => setModifica(nuovo())}>
            Nuovo servizio
          </button>
        )}
        {modifica !== null && (
          <fieldset className={stile.editor} disabled={inviando}>
            <legend className={stile.sottotitolo}>{modifica.id === null ? 'Nuovo servizio' : 'Modifica servizio'}</legend>
            <label className={stile.campoLargo}>
              nome
              <input value={modifica.nome} maxLength={80} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} />
            </label>
            <label className={stile.campoLargo}>
              categoria
              <select value={modifica.categoriaId} onChange={(e) => setModifica({ ...modifica, categoriaId: e.target.value })}>
                {dati.categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <div className={stile.riga}>
              <label className={stile.campo}>
                durata
                <select value={modifica.durata} onChange={(e) => setModifica({ ...modifica, durata: Number(e.target.value) })}>
                  {DURATE.map((d) => <option key={d} value={d}>{minuti(d)}</option>)}
                </select>
              </label>
              <label className={stile.campo}>
                pausa dopo
                <select value={modifica.pausa} onChange={(e) => setModifica({ ...modifica, pausa: Number(e.target.value) })}>
                  {PAUSE.map((p) => <option key={p} value={p}>{minuti(p)}</option>)}
                </select>
              </label>
            </div>
            <div className={stile.azioni}>
              <button type="button" className={stile.secondario} onClick={() => setModifica(null)}>Annulla</button>
              <button
                type="button"
                className={stile.primario}
                onClick={() => esegui(() => azioni.salvaServizio(modifica), () => setModifica(null))}
              >
                Salva
              </button>
            </div>
          </fieldset>
        )}
      </section>
    </div>
  )
}
