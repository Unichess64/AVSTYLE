// src/cliente/striscia-invii.tsx
'use client'
//
// Gli invii pendenti fuori dalla scheda (spec 3a §4.4 punti 1-4; piano 3a-2
// Task 9, D2-4):
//
//   — `StrisciaInvii`, in testa all'agenda: alla riapertura ogni codice rimasto
//     dell'operatrice entrata passa da «Controlla», e la striscia dice «N
//     salvataggi da controllare», toccabile, invece di un foglio bloccante
//     (D2-4: «prima di tutto» diventa «bene in vista»). Ascolta anche
//     l'abbandono della pagina: conferma dove il browser lo permette, e un
//     «Controlla» in `keepalive` solo se la pagina è davvero scartata.
//   — `PulsanteEsci`: «Esci» controlla gli invii pendenti PRIMA di chiudere la
//     sessione, con un limite di 5 s e un «Esci comunque».
//
// ⚠︎ Limite dichiarato (§4.4 punto 1): su iPhone la conferma all'abbandono non
// basta, perché iOS chiude da solo un'app sospesa senza avvisare la pagina. Lo
// regge `localStorage`, controllato alla riapertura.
//
// ⚠︎ NIENTE attributi `style`: la CSP di produzione li blocca.
import { useEffect, useRef, useState } from 'react'
import type { RispostaDellaRotta } from '../dominio/controlla'
import {
  type InvioPendente,
  alPagehide,
  daControllare,
  depositoDelTelefono,
  fraseDelPendente,
  inQuestaPagina,
  leggiInvii,
  togliInvio,
} from '../dominio/invii-pendenti'
import type { StatoVisita } from '../dominio/stato-visita'
import { UscitaForzata, controllaInvio, richiesteVere } from './richieste-scheda'
import stile from './striscia-invii.module.css'

type Controlla = (codice: string, visitaId: string) => Promise<RispostaDellaRotta>
type NomeDi = (visitaId: string, stato: StatoVisita) => Promise<string | null>

/** Il nome della cliente, LETTO dal database: la visita nel suo giorno. Un guasto è «senza nome». */
const nomeLetto: NomeDi = async (visitaId, stato) => {
  try {
    const g = await richiesteVere.giorno(stato.data)
    return g.appuntamenti.find((a) => a.visitaId === visitaId)?.clienteNome ?? null
  } catch {
    return null
  }
}

const esciAllAccesso = () => window.location.assign('/accesso')

type Voce =
  | { readonly invio: InvioPendente; readonly stato: 'in_corso' | 'non_so' }
  | { readonly invio: InvioPendente; readonly stato: 'fatto'; readonly frase: string }

/**
 * Un «Controlla» per un invio pendente: la frase se è definitivo, `null` se è
 * «Non so». ⚠︎ NON toglie il codice: lo toglie chi MOSTRA l'esito. Togliendolo
 * alla risposta, un esito che nessuno ha visto spariva alla ricarica successiva
 * (revisione del Task 9, B1; e W8 per «Esci», misurato in `next start`).
 */
async function controllaUno(invio: InvioPendente, controlla: Controlla, nomeDi: NomeDi | null): Promise<string | null> {
  const r = await controlla(invio.codice, invio.visitaId).catch((e: unknown) => {
    if (e instanceof UscitaForzata) throw e
    return { tipo: 'non_so' } as const
  })
  if (r.tipo === 'non_so') return null
  const nome = r.stato !== null && nomeDi !== null ? await nomeDi(invio.visitaId, r.stato) : null
  return fraseDelPendente(invio, r, nome)
}

/**
 * Quanto dura al massimo un invio sul server: 7 s di ritentativi più gli 8 s
 * di `statement_timeout`, e un margine. Un codice più giovane può essere di
 * un'altra scheda del browser con l'invio ancora in volo: bruciarlo da qui lo
 * farebbe tornare `annullato` (revisione del Task 9). Si aspetta, e se nel
 * frattempo quella scheda ha avuto la sua risposta il codice non c'è più.
 */
const VITA_INVIO_MS = 20_000

const quanti = (n: number) => (n === 1 ? '1 salvataggio da controllare' : `${n} salvataggi da controllare`)
const ORA = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function StrisciaInvii({
  io,
  controlla = controllaInvio,
  controllaAllAbbandono = (codice, visitaId) => void controllaInvio(codice, visitaId, true),
  nomeDi = nomeLetto,
  vitaInvioMs = VITA_INVIO_MS,
}: {
  /** L'`operator.id` di chi ha fatto l'accesso: si controllano solo i SUOI codici. */
  io: string
  controlla?: Controlla
  controllaAllAbbandono?: (codice: string, visitaId: string) => void
  nomeDi?: NomeDi
  /** Solo per le prove: quanto può restare in volo un invio. */
  vitaInvioMs?: number
}) {
  const [voci, setVoci] = useState<readonly Voce[]>([])
  const [aperta, setAperta] = useState(false)
  const viva = useRef(true)

  const controllaOra = (invio: InvioPendente) => {
    // Nel frattempo un'altra scheda può averlo chiuso con la sua risposta.
    if (!leggiInvii(depositoDelTelefono()).some((x) => x.codice === invio.codice)) {
      setVoci((v) => v.filter((x) => x.invio.codice !== invio.codice))
      return
    }
    controllaUno(invio, controlla, nomeDi).then(
        (frase) => {
          if (!viva.current) return
          setVoci((v) =>
            v.map((x) => (x.invio.codice !== invio.codice ? x : frase === null ? { invio, stato: 'non_so' } : { invio, stato: 'fatto', frase })),
          )
        },
        () => esciAllAccesso(),
      )
  }

  const esegui = (dachi: readonly InvioPendente[]) => {
    setVoci((v) => v.map((x) => (dachi.some((d) => d.codice === x.invio.codice) ? { invio: x.invio, stato: 'in_corso' } : x)))
    for (const invio of dachi) {
      const aspetta = invio.toccatoIl + vitaInvioMs - Date.now()
      if (aspetta <= 0) controllaOra(invio)
      else attese.current.push(setTimeout(() => viva.current && controllaOra(invio), aspetta))
    }
  }
  const attese = useRef<ReturnType<typeof setTimeout>[]>([])

  // B1: il codice si toglie quando l'esito SI VEDE, cioè con la striscia aperta.
  useEffect(() => {
    if (!aperta) return
    for (const x of voci) if (x.stato === 'fatto') togliInvio(depositoDelTelefono(), x.invio.codice)
  }, [aperta, voci])

  // Alla riapertura, prima di tutto: una fotografia dei codici rimasti. Quelli
  // che la scheda scriverà da qui in poi non sono di questa striscia.
  useEffect(() => {
    viva.current = true
    const pendenti = daControllare(depositoDelTelefono(), io, Date.now())
    setVoci(pendenti.map((invio) => ({ invio, stato: 'in_corso' })))
    esegui(pendenti)
    return () => {
      viva.current = false
      for (const t of attese.current.splice(0)) clearTimeout(t)
    }
    // Una volta per caricamento della pagina, e per operatrice.
  }, [io])

  // §4.4 punti 1 e 2: l'abbandono, con i codici pendenti toccati in QUESTA
  // pagina (revisione del Task 9). Quelli lasciati da un'altra pagina non
  // tengono ferma l'operatrice, e quelli di un'altra scheda del browser, forse
  // ancora in volo, non si bruciano da qui: li controlla la riapertura.
  useEffect(() => {
    const prima = (e: BeforeUnloadEvent) => {
      if (inQuestaPagina(depositoDelTelefono()).length === 0) return
      e.preventDefault()
      e.returnValue = ''
    }
    const via = (e: PageTransitionEvent) => alPagehide(e.persisted, inQuestaPagina(depositoDelTelefono()), controllaAllAbbandono)
    window.addEventListener('beforeunload', prima)
    window.addEventListener('pagehide', via)
    return () => {
      window.removeEventListener('beforeunload', prima)
      window.removeEventListener('pagehide', via)
    }
  }, [io, controllaAllAbbandono])

  if (voci.length === 0) return null
  const nonSo = voci.filter((x) => x.stato === 'non_so').map((x) => x.invio)
  return (
    <section className={stile.striscia} aria-label="Salvataggi da controllare">
      <button type="button" className={stile.apri} aria-expanded={aperta} onClick={() => setAperta((a) => !a)}>
        {quanti(voci.length)}
      </button>
      {aperta && (
        <ul className={stile.voci}>
          {voci.map((x) => (
            <li key={x.invio.codice}>
              {x.stato === 'fatto'
                ? x.frase
                : x.stato === 'non_so'
                  ? `Il salvataggio delle ${ORA.format(x.invio.toccatoIl)}: Non so se è stato salvato`
                  : 'Controllo…'}
            </li>
          ))}
        </ul>
      )}
      {aperta && nonSo.length > 0 && (
        <button type="button" className={stile.secondario} onClick={() => esegui(nonSo)}>
          Controlla di nuovo
        </button>
      )}
    </section>
  )
}

type Uscita =
  | { readonly tipo: 'ferma' }
  | { readonly tipo: 'controllo' }
  | { readonly tipo: 'esiti'; readonly frasi: readonly string[]; readonly restano: number }

export function PulsanteEsci({
  io,
  esci,
  controlla = controllaInvio,
  limiteMs = 5_000,
  classe,
}: {
  io: string
  /** La Server Action che chiude la sessione di questo telefono. */
  esci: () => Promise<void> | void
  controlla?: Controlla
  /** [proposta] di §4.4 punto 4: 5 s, poi «Esci comunque». */
  limiteMs?: number
  classe?: string
}) {
  const [uscita, setUscita] = useState<Uscita>({ tipo: 'ferma' })

  const tocca = async () => {
    const pendenti = daControllare(depositoDelTelefono(), io, Date.now())
    if (pendenti.length === 0) return void (await esci())
    setUscita({ tipo: 'controllo' })
    const frasi: string[] = []
    let restano = pendenti.length
    let scaduto = false
    try {
      const tutti = Promise.all(
        pendenti.map(async (p) => {
          const f = await controllaUno(p, controlla, null)
          // Dopo il limite l'esito non lo vede nessuno: il codice RESTA (W8).
          if (f !== null && !scaduto) {
            togliInvio(depositoDelTelefono(), p.codice)
            frasi.push(f)
            restano -= 1
          }
        }),
      )
      await Promise.race([tutti, new Promise((fatto) => setTimeout(fatto, limiteMs))])
      scaduto = true
    } catch {
      // l'account è chiuso: si esce comunque, e la sessione è già finita
      return void (await esci())
    }
    // Tutti controllati e nessuno da guardare: si esce. Altrimenti si mostra.
    if (restano === 0 && frasi.every((f) => f.startsWith('✓'))) return void (await esci())
    setUscita({ tipo: 'esiti', frasi: [...frasi], restano })
  }

  return (
    <>
      <button type="button" className={classe} disabled={uscita.tipo === 'controllo'} onClick={() => void tocca()}>
        Esci
      </button>
      {uscita.tipo === 'controllo' && (
        <p className={stile.uscita} role="status">
          Controllo i salvataggi in sospeso…
        </p>
      )}
      {uscita.tipo === 'esiti' && (
        <div className={stile.uscita} role="alertdialog" aria-label="Prima di uscire">
          {uscita.frasi.map((f) => (
            <p key={f}>{f}</p>
          ))}
          {uscita.restano > 0 && (
            <p>
              {uscita.restano === 1
                ? 'Non riesco a controllare 1 salvataggio: lo controllo al prossimo accesso.'
                : `Non riesco a controllare ${uscita.restano} salvataggi: li controllo al prossimo accesso.`}
            </p>
          )}
          <div className={stile.pulsanti}>
            <button type="button" className={stile.primario} onClick={() => void esci()}>
              {uscita.restano > 0 ? 'Esci comunque' : 'Esci ora'}
            </button>
            <button type="button" className={stile.secondario} onClick={() => setUscita({ tipo: 'ferma' })}>
              Resta
            </button>
          </div>
        </div>
      )}
    </>
  )
}
