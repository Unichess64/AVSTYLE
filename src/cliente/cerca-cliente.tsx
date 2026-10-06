// src/cliente/cerca-cliente.tsx
'use client'
//
// La cliente della scheda (spec 3a §5.4 punto 1, spec §8.2): ricerca per nome
// o telefono, oppure «Nuova cliente» con nome, telefono, compleanno, la riga
// sull'informativa (§11.1) e i doppioni — stesso telefono o nome simile.
//
// ⚠︎ NESSUN `<form>`: un modulo senza metodo è in GET e metterebbe il testo
// cercato nell'indirizzo (§4.8). Le richieste partono in POST da
// `richieste-scheda.ts`, e il testo resta nel corpo.
import { useEffect, useRef, useState } from 'react'
import {
  type ClienteNuova,
  type ClienteScelta,
  compleannoPossibile,
  nuovaCliente,
  telefonoDalModulo,
} from '../dominio/scheda'
import type { ClienteTrovata, Doppione } from '../server/lettura-scheda'
import type { RichiesteScheda } from './richieste-scheda'
import stile from './scheda-visita.module.css'

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

// Una ricerca parte quando la mano si ferma, non a ogni lettera.
const ATTESA_MS = 300

/**
 * Una richiesta che parte dopo una pausa, e le risposte vecchie scartate: la
 * risposta a «mar» non deve sovrascrivere quella a «maria».
 */
function useLettura<T>(chiave: string | null, leggi: () => Promise<T>, onGuasto: (e: unknown) => void): T | null {
  const [risultato, setRisultato] = useState<T | null>(null)
  const generazione = useRef(0)
  useEffect(() => {
    const mia = ++generazione.current
    if (chiave === null) {
      setRisultato(null)
      return
    }
    const t = setTimeout(() => {
      leggi().then(
        (r) => {
          if (mia === generazione.current) setRisultato(r)
        },
        (e) => {
          if (mia === generazione.current) onGuasto(e)
        },
      )
    }, ATTESA_MS)
    return () => clearTimeout(t)
    // `leggi` e `onGuasto` cambiano a ogni disegno: decide la chiave.
  }, [chiave])
  return risultato
}

const conTelefono = (c: { nome: string; telefono: string | null }) => (c.telefono ? `${c.nome} · ${c.telefono}` : c.nome)

export function CercaCliente({
  cliente,
  nome,
  richieste,
  onCambia,
  onGuasto,
  telefonoScritto,
  onTelefonoScritto,
}: {
  cliente: ClienteScelta | ClienteNuova | null
  /** Il nome della cliente esistente scelta, da mostrare. */
  nome: string | null
  richieste: RichiesteScheda
  onCambia: (cliente: ClienteScelta | ClienteNuova | null, nome: string | null) => void
  onGuasto: (e: unknown) => void
  /**
   * Il telefono COME SCRITTO. Sta nella scheda e non qui: il modello tiene solo
   * l'E.164, e la scheda deve sapere se un numero scritto non è stato
   * riconosciuto per tenere spento «Salva» (revisione del Task 7, B1).
   */
  telefonoScritto: string
  onTelefonoScritto: (testo: string) => void
}) {
  const [testo, setTesto] = useState('')

  const cerca = cliente === null && testo.trim().length >= 2 ? testo.trim() : null
  const trovate = useLettura<ClienteTrovata[]>(cerca, () => richieste.cerca(cerca!), onGuasto)

  const nuova = cliente?.tipo === 'nuova' ? cliente : null
  const telefono = telefonoDalModulo(telefonoScritto)
  const chiaveDoppioni =
    nuova !== null && (nuova.nome.trim().length >= 3 || telefono.e164 !== null)
      ? `${nuova.nome.trim()}\u0000${telefono.e164 ?? ''}`
      : null
  const doppioni = useLettura<Doppione[]>(
    chiaveDoppioni,
    () => richieste.doppioni(nuova!.nome.trim(), telefono.e164),
    onGuasto,
  )

  const scegli = (c: { id: string; nome: string }) => {
    setTesto('')
    onCambia({ tipo: 'esistente', id: c.id }, c.nome)
  }

  if (cliente?.tipo === 'esistente') {
    return (
      <div className={stile.clienteScelta}>
        <span className={stile.nomeCliente}>{nome ?? 'Cliente'}</span>
        <button type="button" className={stile.secondario} onClick={() => onCambia(null, null)}>
          Cambia
        </button>
      </div>
    )
  }

  if (nuova !== null) {
    const aggiorna = (campi: Partial<ClienteNuova>) => onCambia({ ...nuova, ...campi }, null)
    const compleannoOk = compleannoPossibile(nuova.meseDiNascita, nuova.giornoDiNascita)
    return (
      <div className={stile.nuovaCliente}>
        <label className={stile.campo}>
          <span>Nome e cognome</span>
          <input
            type="text"
            autoComplete="off"
            value={nuova.nome}
            onChange={(e) => aggiorna({ nome: e.target.value })}
          />
        </label>
        <label className={stile.campo}>
          <span>Telefono</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={telefonoScritto}
            onChange={(e) => {
              onTelefonoScritto(e.target.value)
              aggiorna({ telefono: telefonoDalModulo(e.target.value).e164 })
            }}
          />
        </label>
        {telefono.errato && <p className={stile.errore}>Numero non riconosciuto</p>}
        <fieldset className={stile.compleanno}>
          <legend>Compleanno</legend>
          <select
            aria-label="Giorno del compleanno"
            value={nuova.giornoDiNascita ?? ''}
            onChange={(e) => aggiorna({ giornoDiNascita: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">giorno</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            aria-label="Mese del compleanno"
            value={nuova.meseDiNascita ?? ''}
            onChange={(e) => aggiorna({ meseDiNascita: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">mese</option>
            {MESI.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </fieldset>
        {!compleannoOk && <p className={stile.errore}>Questo compleanno non esiste</p>}
        {/* spec §8.2, §11.1: senza questa riga l'informativa sarebbe un obbligo che nessuna schermata mantiene */}
        <p className={stile.informativa}>
          Nome, telefono e compleanno della cliente vengono registrati nell’agenda del salone. L’informativa completa è
          esposta in salone.
        </p>
        {doppioni !== null && doppioni.length > 0 && (
          <div className={stile.doppioni} role="status">
            <p>Forse è già in elenco:</p>
            <ul>
              {doppioni.map((d) => (
                <li key={d.id}>
                  <span>
                    {conTelefono(d)}
                    {d.motivo === 'telefono' ? ' — stesso telefono' : ' — nome simile'}
                  </span>
                  <button type="button" className={stile.secondario} onClick={() => scegli(d)}>
                    Usa questa
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" className={stile.secondario} onClick={() => onCambia(null, null)}>
          Torna alla ricerca
        </button>
      </div>
    )
  }

  return (
    <div className={stile.ricerca}>
      <input
        type="search"
        aria-label="Cerca la cliente per nome o telefono"
        placeholder="Nome o telefono"
        autoComplete="off"
        enterKeyHint="search"
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
      />
      {cerca !== null && trovate !== null && (
        <ul className={stile.trovate} aria-label="Clienti trovate">
          {trovate.length === 0 && <li className={stile.nessuna}>Nessuna cliente trovata</li>}
          {trovate.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => scegli(c)}>
                {conTelefono(c)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={stile.secondario}
        onClick={() => {
          // Ciò che è già scritto nella ricerca passa alla cliente nuova: nel
          // telefono se ha cifre, altrimenti nel nome.
          const numero = /\d/.test(testo)
          onTelefonoScritto(numero ? testo.trim() : '')
          onCambia(
            { ...nuovaCliente(), nome: numero ? '' : testo.trim(), telefono: numero ? telefonoDalModulo(testo).e164 : null },
            null,
          )
        }}
      >
        Nuova cliente
      </button>
    </div>
  )
}
