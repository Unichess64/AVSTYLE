'use client'
// src/cliente/operatrici.tsx — Impostazioni → Operatrici.
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { EsitoScrittura } from '../server/scrittura-semplice'
import type { Account, RigaOperatrice } from '../server/lettura-operatrici'
import stile from './catalogo.module.css'

const TAVOLOZZA = [
  { nome: 'rosa', colore: '#F3A4BA' },
  { nome: 'bianco', colore: '#FFFFFF' },
  { nome: 'albicocca', colore: '#FFD8B0' },
  { nome: 'giallo', colore: '#FCE38A' },
  { nome: 'lilla', colore: '#D7C4EC' },
  { nome: 'azzurro', colore: '#BFE3F0' },
  { nome: 'menta', colore: '#C9E7D6' },
]

interface Azioni {
  aggiungiOperatrice: (nome: string, colore: string) => Promise<EsitoScrittura>
  attiva: (id: string, attiva: boolean) => Promise<EsitoScrittura>
  cambiaColore: (id: string, colore: string) => Promise<EsitoScrittura>
  chiudiSessioni: (id: string) => Promise<EsitoScrittura>
  collega: (id: string, authUserId: string) => Promise<EsitoScrittura>
  scollega: (id: string) => Promise<EsitoScrittura>
  sposta: (id: string, verso: -1 | 1) => Promise<EsitoScrittura>
}

/** Il pallino del colore: un SVG, perché la CSP non ammette stili in linea. */
function Pallino({ colore }: { colore: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="9" fill={colore} stroke="#140D18" strokeWidth="2" />
    </svg>
  )
}

export function Operatrici({
  operatrici,
  liberi,
  azioni,
}: {
  operatrici: readonly RigaOperatrice[]
  liberi: readonly Account[]
  azioni: Azioni
}) {
  const router = useRouter()
  const [errore, setErrore] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [inviando, avvia] = useTransition()
  const [aperta, setAperta] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const usati = new Set(operatrici.filter((o) => o.attiva).map((o) => o.colore.toUpperCase()))
  const [coloreNuova, setColoreNuova] = useState(TAVOLOZZA.find((t) => !usati.has(t.colore))?.colore ?? TAVOLOZZA[0]!.colore)

  function esegui(
    scrittura: () => Promise<EsitoScrittura>,
    opzioni: { dopo?: (e: Extract<EsitoScrittura, { ok: true }>) => void; esci?: boolean } = {},
  ) {
    setErrore(null)
    setAvviso(null)
    avvia(async () => {
      const esito = await scrittura()
      if (esito.ok) {
        opzioni.dopo?.(esito)
        if (opzioni.esci) router.replace('/accesso')
        else router.refresh()
      } else if (esito.uscita) {
        router.replace('/accesso')
      } else {
        setErrore(esito.testo)
      }
    })
  }

  return (
    <div className={stile.sezioni}>
      {errore !== null && <p className={stile.errore} role="alert">{errore}</p>}
      {avviso !== null && <p className={stile.avviso} role="status">{avviso}</p>}

      <ul className={stile.elenco}>
        {operatrici.map((o, i) => (
          <li key={o.id} className={o.attiva ? stile.servizio : stile.servizioSpento}>
            <div className={stile.voce}>
              <Pallino colore={o.colore} />
              <span className={stile.nome}>
                {o.nome}
                {o.io && ' (tu)'}
                {!o.attiva && ' — disattivata'}
              </span>
              <button type="button" className={stile.secondario} disabled={inviando || i === 0}
                aria-label={`Sposta ${o.nome} prima`} onClick={() => esegui(() => azioni.sposta(o.id, -1))}>↑</button>
              <button type="button" className={stile.secondario} disabled={inviando || i === operatrici.length - 1}
                aria-label={`Sposta ${o.nome} dopo`} onClick={() => esegui(() => azioni.sposta(o.id, 1))}>↓</button>
            </div>
            <p className={stile.nota}>
              {o.stato === 'collegata' ? `Account: ${o.email}` : o.stato === 'orfana' ? 'Collegata a un account che non esiste più' : 'Non collegata a nessun account'}
            </p>
            {aperta !== o.id ? (
              <div className={stile.azioni}>
                <button type="button" className={stile.secondario} disabled={inviando} onClick={() => setAperta(o.id)}>
                  Gestisci
                </button>
              </div>
            ) : (
              <fieldset className={stile.editor} disabled={inviando}>
                <legend className={stile.sottotitolo}>{o.nome}</legend>

                <div className={stile.chi} role="group" aria-label="Colore">
                  {TAVOLOZZA.map((t) => {
                    const diAltra = usati.has(t.colore) && o.colore.toUpperCase() !== t.colore
                    return (
                      <button key={t.colore} type="button" className={stile.chip}
                        aria-pressed={o.colore.toUpperCase() === t.colore} disabled={diAltra}
                        title={diAltra ? 'Già di un’altra operatrice' : t.nome}
                        onClick={() => esegui(() => azioni.cambiaColore(o.id, t.colore))}>
                        <Pallino colore={t.colore} /> {t.nome}
                      </button>
                    )
                  })}
                </div>

                {o.stato !== 'collegata' && liberi.length > 0 && (
                  <label className={stile.campoLargo}>
                    collega all'account
                    <select defaultValue="" onChange={(e) => e.target.value !== '' && esegui(() => azioni.collega(o.id, e.target.value))}>
                      <option value="">scegli…</option>
                      {liberi.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
                    </select>
                  </label>
                )}

                <div className={stile.azioni}>
                  {o.stato === 'collegata' && !o.io && o.attiva && (
                    <button type="button" className={stile.secondario}
                      onClick={() => {
                        if (window.confirm(`Chiudere tutte le sessioni di ${o.nome}? Dovrà rientrare con la password.`)) {
                          esegui(() => azioni.chiudiSessioni(o.id), {
                            dopo: (e) => setAvviso(!e.quante ? 'Nessuna sessione aperta' : e.quante === 1 ? '1 sessione chiusa' : `${e.quante} sessioni chiuse`),
                          })
                        }
                      }}>
                      Chiudi tutte le sessioni
                    </button>
                  )}
                  {o.stato !== 'non_collegata' && (
                    <button type="button" className={stile.secondario}
                      onClick={() => {
                        const testo = o.io
                          ? 'Scollegarti dal tuo account? Uscirai subito dall’app e potrà farti rientrare solo una collega.'
                          : `Scollegare ${o.nome} dal suo account? Non potrà più entrare.`
                        if (window.confirm(testo)) esegui(() => azioni.scollega(o.id), { esci: o.io })
                      }}>
                      Scollega
                    </button>
                  )}
                  <button type="button" className={stile.secondario}
                    onClick={() => {
                      const testo = o.attiva
                        ? o.io
                          ? 'Disattivarti? Uscirai subito dall’app e potrà farti rientrare solo una collega. I tuoi appuntamenti restano in agenda.'
                          : `Disattivare ${o.nome}? Uscirà subito dall’app. I suoi appuntamenti restano in agenda.`
                        : `Riattivare ${o.nome}? Dovrà rientrare con la password.`
                      if (window.confirm(testo)) esegui(() => azioni.attiva(o.id, !o.attiva), { esci: o.io && o.attiva })
                    }}>
                    {o.attiva ? 'Disattiva' : 'Riattiva'}
                  </button>
                  <button type="button" className={stile.primario} onClick={() => setAperta(null)}>Chiudi</button>
                </div>
              </fieldset>
            )}
          </li>
        ))}
      </ul>

      <fieldset className={stile.editor} disabled={inviando}>
        <legend className={stile.sottotitolo}>Nuova operatrice</legend>
        <label className={stile.campoLargo}>
          nome
          <input value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} />
        </label>
        <div className={stile.chi} role="group" aria-label="Colore">
          {TAVOLOZZA.map((t) => (
            <button key={t.colore} type="button" className={stile.chip} aria-pressed={coloreNuova === t.colore}
              disabled={usati.has(t.colore)} onClick={() => setColoreNuova(t.colore)}>
              <Pallino colore={t.colore} /> {t.nome}
            </button>
          ))}
        </div>
        <div className={stile.azioni}>
          <button type="button" className={stile.primario}
            onClick={() => esegui(() => azioni.aggiungiOperatrice(nome, coloreNuova), { dopo: () => setNome('') })}>
            Aggiungi
          </button>
        </div>
      </fieldset>
    </div>
  )
}
