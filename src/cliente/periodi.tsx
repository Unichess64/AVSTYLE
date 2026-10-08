'use client'
// src/cliente/periodi.tsx — «Ferie e assenze» (Disponibilità) e «Chiusure del salone» (Impostazioni).
// Prima di salvare si vedono gli appuntamenti già presi che ci cadono dentro, con il
// telefono della cliente: restano in agenda e vanno spostati a mano.
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { dataBreve } from '../dominio/avvisi'
import type { AppuntamentoColpito, Coppia, Periodo } from '../dominio/periodi'
import { oraDaCella, oraDaConfine } from '../dominio/tempo'
import type { Anteprima } from '../server/azioni-periodi'
import type { Chiusura } from '../server/lettura-periodi'
import type { EsitoScrittura } from '../server/scrittura-semplice'
import stile from './catalogo.module.css'

const CONFINI = Array.from({ length: 289 }, (_, i) => i)

function quando(dal: string, al: string): string {
  return dal === al ? dataBreve(dal) : `dal ${dataBreve(dal)} al ${dataBreve(al)}`
}

function Colpiti({ colpiti, conNome }: { colpiti: readonly AppuntamentoColpito[]; conNome: boolean }) {
  if (colpiti.length === 0) return <p className={stile.nota}>Nessun appuntamento già preso in questo periodo.</p>
  return (
    <div className={stile.avvisoAmbra} role="status">
      <p>
        {colpiti.length === 1
          ? 'C’è 1 appuntamento già preso: resta in agenda, va spostato.'
          : `Ci sono ${colpiti.length} appuntamenti già presi: restano in agenda, vanno spostati.`}
      </p>
      <ul className={stile.elenco}>
        {colpiti.map((a, i) => (
          <li key={i} className={stile.voce}>
            <span className={stile.nome}>
              {dataBreve(a.data)}, {oraDaCella(a.inizio)} — {a.cliente}
            </span>
            <span className={stile.nota}>
              {a.servizio}
              {conNome && a.operatrice !== '' && ` con ${a.operatrice}`}
              {' · '}
              {a.telefono === null ? 'nessun telefono' : <a href={`tel:${a.telefono}`}>{a.telefono}</a>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SelettoreOra({ etichetta, valore, onCambia, da }: { etichetta: string; valore: number; onCambia: (v: number) => void; da: 0 | 1 }) {
  return (
    <label className={stile.campo}>
      {etichetta}
      <select value={valore} onChange={(e) => onCambia(Number(e.target.value))}>
        {CONFINI.slice(da, da === 0 ? 288 : 289).map((c) => <option key={c} value={c}>{oraDaConfine(c)}</option>)}
      </select>
    </label>
  )
}

/** Lo scheletro comune: esito delle scritture e ricarica della pagina. */
function useScritture() {
  const router = useRouter()
  const [errore, setErrore] = useState<string | null>(null)
  const [inviando, avvia] = useTransition()
  function esegui(fn: () => Promise<EsitoScrittura | Anteprima>, dopo?: (r: EsitoScrittura | Anteprima) => void) {
    setErrore(null)
    avvia(async () => {
      const r = await fn()
      if (r.ok) {
        dopo?.(r)
      } else if (r.uscita) router.replace('/accesso')
      else setErrore(r.testo)
    })
  }
  return { router, errore, setErrore, inviando, esegui }
}

export function Assenze({
  operatriceId,
  nome,
  oggi,
  assenze,
  azioni,
}: {
  operatriceId: string
  nome: string
  oggi: string
  assenze: readonly Periodo[]
  azioni: {
    anteprima: (id: string, dal: string, al: string, fasce: Coppia[]) => Promise<Anteprima>
    salva: (id: string, dal: string, al: string, fasce: Coppia[]) => Promise<EsitoScrittura>
    cancella: (id: string, dal: string, al: string) => Promise<EsitoScrittura>
  }
}) {
  const { router, errore, inviando, esegui } = useScritture()
  const [modulo, setModulo] = useState<{ dal: string; al: string; ridotto: boolean; fasce: Coppia[] } | null>(null)
  const [colpiti, setColpiti] = useState<readonly AppuntamentoColpito[] | null>(null)
  const cambia = (m: Partial<NonNullable<typeof modulo>>) => {
    setModulo((x) => (x === null ? x : { ...x, ...m }))
    setColpiti(null)
  }
  const fasce = modulo === null || !modulo.ridotto ? [] : modulo.fasce

  return (
    <section className={stile.sezione} aria-labelledby="titolo-assenze">
      <h2 id="titolo-assenze" className={stile.sottotitolo}>Ferie e assenze di {nome}</h2>
      {errore !== null && <p className={stile.errore} role="alert">{errore}</p>}
      {assenze.length === 0 && <p className={stile.nota}>Nessuna assenza in programma.</p>}
      <ul className={stile.elenco}>
        {assenze.map((p) => (
          <li key={p.dal} className={stile.voce}>
            <span className={stile.nome}>{quando(p.dal, p.al)}</span>
            <span className={stile.nota}>
              {p.fasce.length === 0 ? 'assente' : p.fasce.map(([s, e]) => `${oraDaConfine(s)}–${oraDaConfine(e)}`).join(', ')}
            </span>
            <button type="button" className={stile.secondario} disabled={inviando}
              onClick={() => {
                if (window.confirm(`Togliere l’assenza ${quando(p.dal, p.al)}? Torna l’orario della settimana tipo.`)) {
                  esegui(() => azioni.cancella(operatriceId, p.dal, p.al), () => router.refresh())
                }
              }}>
              Togli
            </button>
          </li>
        ))}
      </ul>

      {modulo === null ? (
        <button type="button" className={stile.primario}
          onClick={() => setModulo({ dal: oggi, al: oggi, ridotto: false, fasce: [[108, 192]] })}>
          Nuova assenza
        </button>
      ) : (
        <fieldset className={stile.editor} disabled={inviando}>
          <legend className={stile.sottotitolo}>Nuova assenza</legend>
          <div className={stile.riga}>
            <label className={stile.campo}>
              dal
              <input type="date" value={modulo.dal} min={oggi} onChange={(e) => cambia({ dal: e.target.value, al: e.target.value > modulo.al ? e.target.value : modulo.al })} />
            </label>
            <label className={stile.campo}>
              al
              <input type="date" value={modulo.al} min={modulo.dal} onChange={(e) => cambia({ al: e.target.value })} />
            </label>
          </div>
          <div className={stile.chi} role="group" aria-label="Tipo di assenza">
            <button type="button" className={stile.chip} aria-pressed={!modulo.ridotto} onClick={() => cambia({ ridotto: false })}>
              Assente tutto il giorno
            </button>
            <button type="button" className={stile.chip} aria-pressed={modulo.ridotto} onClick={() => cambia({ ridotto: true })}>
              Orario ridotto
            </button>
          </div>
          {modulo.ridotto &&
            modulo.fasce.map(([s, e], i) => (
              <div key={i} className={stile.riga}>
                <SelettoreOra etichetta="dalle" valore={s} da={0}
                  onCambia={(v) => cambia({ fasce: modulo.fasce.map((f, j): Coppia => (j === i ? [v, f[1]] : f)) })} />
                <SelettoreOra etichetta="alle" valore={e} da={1}
                  onCambia={(v) => cambia({ fasce: modulo.fasce.map((f, j): Coppia => (j === i ? [f[0], v] : f)) })} />
                {modulo.fasce.length > 1 && (
                  <button type="button" className={stile.secondario} onClick={() => cambia({ fasce: modulo.fasce.filter((_, j) => j !== i) })}>
                    Togli
                  </button>
                )}
              </div>
            ))}
          {modulo.ridotto && (
            <button type="button" className={stile.secondario}
              onClick={() => cambia({ fasce: [...modulo.fasce, [Math.min((modulo.fasce.at(-1)?.[1] ?? 108) + 12, 276), 288]] })}>
              Aggiungi fascia
            </button>
          )}
          {colpiti !== null && <Colpiti colpiti={colpiti} conNome={false} />}
          <div className={stile.azioni}>
            <button type="button" className={stile.secondario} onClick={() => { setModulo(null); setColpiti(null) }}>Annulla</button>
            {colpiti === null ? (
              <button type="button" className={stile.primario}
                onClick={() => esegui(() => azioni.anteprima(operatriceId, modulo.dal, modulo.al, fasce), (r) => 'colpiti' in r && setColpiti(r.colpiti))}>
                Controlla e salva
              </button>
            ) : (
              <button type="button" className={stile.primario}
                onClick={() => esegui(() => azioni.salva(operatriceId, modulo.dal, modulo.al, fasce), () => { setModulo(null); setColpiti(null); router.refresh() })}>
                {colpiti.length > 0 ? 'Salva comunque' : 'Salva'}
              </button>
            )}
          </div>
        </fieldset>
      )}
    </section>
  )
}

export function Chiusure({
  oggi,
  chiusure,
  azioni,
}: {
  oggi: string
  chiusure: readonly Chiusura[]
  azioni: {
    anteprima: (dal: string, al: string, da: number | null, a: number | null) => Promise<Anteprima>
    salva: (dal: string, al: string, da: number | null, a: number | null, motivo: string) => Promise<EsitoScrittura>
    cancella: (id: string) => Promise<EsitoScrittura>
  }
}) {
  const { router, errore, inviando, esegui } = useScritture()
  const [modulo, setModulo] = useState<{ dal: string; al: string; intera: boolean; da: number; a: number; motivo: string } | null>(null)
  const [colpiti, setColpiti] = useState<readonly AppuntamentoColpito[] | null>(null)
  const cambia = (m: Partial<NonNullable<typeof modulo>>) => {
    setModulo((x) => (x === null ? x : { ...x, ...m }))
    if (!('motivo' in m)) setColpiti(null)
  }

  return (
    <section className={stile.sezione} aria-labelledby="titolo-chiusure">
      <h2 id="titolo-chiusure" className={stile.sottotitolo}>Chiusure del salone</h2>
      {errore !== null && <p className={stile.errore} role="alert">{errore}</p>}
      {chiusure.length === 0 && <p className={stile.nota}>Nessuna chiusura in programma.</p>}
      <ul className={stile.elenco}>
        {chiusure.map((c) => (
          <li key={c.id} className={stile.voce}>
            <span className={stile.nome}>{quando(c.dal, c.al)}</span>
            <span className={stile.nota}>
              {c.da === null || c.a === null ? 'tutto il giorno' : `dalle ${oraDaConfine(c.da)} alle ${oraDaConfine(c.a)}`} · {c.motivo}
            </span>
            <button type="button" className={stile.secondario} disabled={inviando}
              onClick={() => {
                if (window.confirm(`Togliere la chiusura ${quando(c.dal, c.al)}?`)) esegui(() => azioni.cancella(c.id), () => router.refresh())
              }}>
              Togli
            </button>
          </li>
        ))}
      </ul>

      {modulo === null ? (
        <button type="button" className={stile.primario}
          onClick={() => setModulo({ dal: oggi, al: oggi, intera: true, da: 156, a: 288, motivo: '' })}>
          Nuova chiusura
        </button>
      ) : (
        <fieldset className={stile.editor} disabled={inviando}>
          <legend className={stile.sottotitolo}>Nuova chiusura</legend>
          <div className={stile.riga}>
            <label className={stile.campo}>
              dal
              <input type="date" value={modulo.dal} min={oggi} onChange={(e) => cambia({ dal: e.target.value, al: e.target.value > modulo.al ? e.target.value : modulo.al })} />
            </label>
            <label className={stile.campo}>
              al
              <input type="date" value={modulo.al} min={modulo.dal} onChange={(e) => cambia({ al: e.target.value })} />
            </label>
          </div>
          <div className={stile.chi} role="group" aria-label="Durata della chiusura">
            <button type="button" className={stile.chip} aria-pressed={modulo.intera} onClick={() => cambia({ intera: true })}>
              Tutto il giorno
            </button>
            <button type="button" className={stile.chip} aria-pressed={!modulo.intera} onClick={() => cambia({ intera: false })}>
              Solo alcune ore
            </button>
          </div>
          {!modulo.intera && (
            <div className={stile.riga}>
              <SelettoreOra etichetta="chiuso dalle" valore={modulo.da} da={0} onCambia={(v) => cambia({ da: v })} />
              <SelettoreOra etichetta="alle" valore={modulo.a} da={1} onCambia={(v) => cambia({ a: v })} />
            </div>
          )}
          <label className={stile.campoLargo}>
            motivo (niente nomi di clienti)
            <input value={modulo.motivo} maxLength={120} placeholder="Ferie, festività, inventario…" onChange={(e) => cambia({ motivo: e.target.value })} />
          </label>
          {colpiti !== null && <Colpiti colpiti={colpiti} conNome />}
          <div className={stile.azioni}>
            <button type="button" className={stile.secondario} onClick={() => { setModulo(null); setColpiti(null) }}>Annulla</button>
            {colpiti === null ? (
              <button type="button" className={stile.primario}
                onClick={() => esegui(
                  () => azioni.anteprima(modulo.dal, modulo.al, modulo.intera ? null : modulo.da, modulo.intera ? null : modulo.a),
                  (r) => 'colpiti' in r && setColpiti(r.colpiti),
                )}>
                Controlla e salva
              </button>
            ) : (
              <button type="button" className={stile.primario}
                onClick={() => esegui(
                  () => azioni.salva(modulo.dal, modulo.al, modulo.intera ? null : modulo.da, modulo.intera ? null : modulo.a, modulo.motivo),
                  () => { setModulo(null); setColpiti(null); router.refresh() },
                )}>
                {colpiti.length > 0 ? 'Salva comunque' : 'Salva'}
              </button>
            )}
          </div>
        </fieldset>
      )}
    </section>
  )
}
