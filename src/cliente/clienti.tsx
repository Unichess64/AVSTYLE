'use client'
// src/cliente/clienti.tsx — Clienti: ricerca, scheda, modifica. Le letture vanno in POST
// a /api/scheda: il nome cercato viaggia nel corpo, mai nell'indirizzo (§4.8).
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { dataBreve } from '../dominio/avvisi'
import { telefonoDalModulo } from '../dominio/scheda'
import { oraDaCella } from '../dominio/tempo'
import type { ClienteTrovata, Doppione, SchedaCliente } from '../server/lettura-scheda'
import type { EsitoScrittura } from '../server/scrittura-semplice'
import stile from './catalogo.module.css'

async function chiedi<T>(corpo: unknown): Promise<T | 'uscita'> {
  const r = await fetch('/api/scheda', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
    cache: 'no-store',
  })
  if (r.status === 401) return 'uscita'
  if (!r.ok) throw new Error(`lettura fallita: ${r.status}`)
  return (await r.json()) as T
}

export function Clienti({
  oggi,
  aggiorna,
  crea,
}: {
  oggi: string
  aggiorna: (id: string, nome: string, telefono: string) => Promise<EsitoScrittura>
  crea: (nome: string, telefono: string) => Promise<EsitoScrittura & { id?: string }>
}) {
  const router = useRouter()
  const [testo, setTesto] = useState('')
  const [trovate, setTrovate] = useState<ClienteTrovata[]>([])
  const [scheda, setScheda] = useState<SchedaCliente | null>(null)
  const [modifica, setModifica] = useState<{ nome: string; telefono: string } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [inviando, avvia] = useTransition()
  const [nuova, setNuova] = useState<{ nome: string; telefono: string } | null>(null)
  /** I possibili doppioni trovati prima di creare: `null` = non ancora cercati. */
  const [doppioni, setDoppioni] = useState<Doppione[] | null>(null)

  function creaNuova(anche: boolean) {
    if (nuova === null) return
    setErrore(null)
    const tel = telefonoDalModulo(nuova.telefono)
    if (nuova.nome.trim() === '') return setErrore('Scrivi nome e cognome')
    if (tel.errato) return setErrore('Il numero di telefono non è valido')
    avvia(async () => {
      if (!anche) {
        // Come la scheda visita: prima si guarda se c'è già, per nome o telefono.
        try {
          const trovati = await chiedi<Doppione[]>({ tipo: 'doppioni', nome: nuova.nome, telefono: tel.e164 })
          if (trovati === 'uscita') return router.replace('/accesso')
          if (trovati.length > 0) return setDoppioni(trovati)
        } catch {
          return setErrore('Non riesco a controllare i doppioni: controlla la connessione.')
        }
      }
      const esito = await crea(nuova.nome, nuova.telefono)
      if (esito.ok && esito.id !== undefined) {
        setNuova(null)
        setDoppioni(null)
        await apri(esito.id)
      } else if (!esito.ok && esito.uscita) router.replace('/accesso')
      else if (!esito.ok) setErrore(esito.testo)
    })
  }

  // La ricerca parte 300 ms dopo l'ultima lettera.
  useEffect(() => {
    if (testo.trim().length < 2) {
      setTrovate([])
      return
    }
    let viva = true
    const t = setTimeout(() => {
      chiedi<ClienteTrovata[]>({ tipo: 'cerca', testo }).then(
        (r) => {
          if (!viva) return
          if (r === 'uscita') router.replace('/accesso')
          else setTrovate(r)
        },
        () => viva && setErrore('Non riesco a cercare: controlla la connessione.'),
      )
    }, 300)
    return () => {
      viva = false
      clearTimeout(t)
    }
  }, [testo, router])

  async function apri(id: string) {
    setErrore(null)
    setModifica(null)
    try {
      const r = await chiedi<SchedaCliente | null>({ tipo: 'cliente', id })
      if (r === 'uscita') return router.replace('/accesso')
      if (r === null) return setErrore('Questa cliente non esiste più.')
      setScheda(r)
    } catch {
      setErrore('Non riesco a leggere la cliente: controlla la connessione.')
    }
  }

  function salva() {
    if (scheda === null || modifica === null) return
    setErrore(null)
    avvia(async () => {
      const esito = await aggiorna(scheda.id, modifica.nome, modifica.telefono)
      if (esito.ok) await apri(scheda.id)
      else if (esito.uscita) router.replace('/accesso')
      else setErrore(esito.testo)
    })
  }

  if (scheda !== null) {
    const prossimi = scheda.appuntamenti.filter((a) => a.data >= oggi).reverse()
    const passati = scheda.appuntamenti.filter((a) => a.data < oggi)
    const riga = (a: (typeof scheda.appuntamenti)[number], i: number) => (
      <li key={i} className={stile.voce}>
        <span className={stile.nome}>
          {dataBreve(a.data)}, {oraDaCella(a.inizio)}
        </span>
        <span className={stile.nota}>
          {a.servizio}
          {a.operatrice !== '' && ` con ${a.operatrice}`}
        </span>
      </li>
    )
    return (
      <div className={stile.sezioni}>
        <button type="button" className={stile.secondario} onClick={() => setScheda(null)}>
          ← Torna alla ricerca
        </button>
        {errore !== null && <p className={stile.errore} role="alert">{errore}</p>}
        <section className={stile.sezione} aria-labelledby="nome-cliente">
          {modifica === null ? (
            <>
              <h2 id="nome-cliente" className={stile.sottotitolo}>{scheda.nome}</h2>
              <p className={stile.nota}>
                {scheda.telefono === null ? 'Nessun telefono' : <a href={`tel:${scheda.telefono}`}>{scheda.telefono}</a>}
              </p>
              <div className={stile.azioni}>
                <button type="button" className={stile.secondario}
                  onClick={() => setModifica({ nome: scheda.nome, telefono: scheda.telefono ?? '' })}>
                  Modifica
                </button>
              </div>
            </>
          ) : (
            <fieldset className={stile.editor} disabled={inviando}>
              <legend id="nome-cliente" className={stile.sottotitolo}>Modifica cliente</legend>
              <label className={stile.campoLargo}>
                nome e cognome
                <input value={modifica.nome} maxLength={120} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} />
              </label>
              <label className={stile.campoLargo}>
                telefono
                <input type="tel" inputMode="tel" value={modifica.telefono}
                  onChange={(e) => setModifica({ ...modifica, telefono: e.target.value })} />
              </label>
              <div className={stile.azioni}>
                <button type="button" className={stile.secondario} onClick={() => setModifica(null)}>Annulla</button>
                <button type="button" className={stile.primario} onClick={salva}>{inviando ? 'Salvo…' : 'Salva'}</button>
              </div>
            </fieldset>
          )}
        </section>
        <section className={stile.sezione} aria-labelledby="prossimi">
          <h2 id="prossimi" className={stile.sottotitolo}>Prossimi appuntamenti</h2>
          {prossimi.length === 0 ? <p className={stile.nota}>Nessuno.</p> : <ul className={stile.elenco}>{prossimi.map(riga)}</ul>}
        </section>
        <section className={stile.sezione} aria-labelledby="storico">
          <h2 id="storico" className={stile.sottotitolo}>Storico</h2>
          {passati.length === 0 ? <p className={stile.nota}>Nessuno.</p> : <ul className={stile.elenco}>{passati.map(riga)}</ul>}
        </section>
      </div>
    )
  }

  if (nuova !== null) {
    return (
      <div className={stile.sezioni}>
        {errore !== null && <p className={stile.errore} role="alert">{errore}</p>}
        <fieldset className={stile.editor} disabled={inviando}>
          <legend className={stile.sottotitolo}>Nuova cliente</legend>
          <label className={stile.campoLargo}>
            nome e cognome
            <input value={nuova.nome} maxLength={120} autoComplete="off"
              onChange={(e) => { setNuova({ ...nuova, nome: e.target.value }); setDoppioni(null) }} />
          </label>
          <label className={stile.campoLargo}>
            telefono (facoltativo)
            <input type="tel" inputMode="tel" value={nuova.telefono} autoComplete="off"
              onChange={(e) => { setNuova({ ...nuova, telefono: e.target.value }); setDoppioni(null) }} />
          </label>
          {doppioni !== null && (
            <div className={stile.avvisoAmbra} role="status">
              <p>Forse è già in elenco:</p>
              <ul className={stile.elenco}>
                {doppioni.map((d) => (
                  <li key={d.id}>
                    <button type="button" className={stile.voceCliente} onClick={() => { setNuova(null); setDoppioni(null); void apri(d.id) }}>
                      <span className={stile.nome}>{d.nome}</span>
                      <span className={stile.nota}>{d.telefono ?? 'nessun telefono'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={stile.azioni}>
            <button type="button" className={stile.secondario} onClick={() => { setNuova(null); setDoppioni(null); setErrore(null) }}>
              Annulla
            </button>
            <button type="button" className={stile.primario} onClick={() => creaNuova(doppioni !== null)}>
              {inviando ? 'Salvo…' : doppioni !== null ? 'Crea comunque' : 'Crea'}
            </button>
          </div>
        </fieldset>
      </div>
    )
  }

  return (
    <div className={stile.sezioni}>
      <div className={stile.azioni}>
        <button type="button" className={stile.primario}
          onClick={() => { setErrore(null); setNuova({ nome: testo.trim(), telefono: '' }) }}>
          Nuova cliente
        </button>
      </div>
      <label className={stile.campoLargo}>
        cerca per nome o telefono
        <input type="search" value={testo} onChange={(e) => setTesto(e.target.value)} autoComplete="off" />
      </label>
      {errore !== null && <p className={stile.errore} role="alert">{errore}</p>}
      {testo.trim().length >= 2 && trovate.length === 0 && <p className={stile.nota}>Nessuna cliente trovata.</p>}
      <ul className={stile.elenco}>
        {trovate.map((c) => (
          <li key={c.id}>
            <button type="button" className={stile.voceCliente} onClick={() => apri(c.id)}>
              <span className={stile.nome}>{c.nome}</span>
              <span className={stile.nota}>{c.telefono ?? 'nessun telefono'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
