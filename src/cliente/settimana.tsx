// src/cliente/settimana.tsx
'use client'
//
// La settimana di un'operatrice (spec 3a §5.3, spec §9.3): sette colonne di
// circa 48 punti con la sola ora d'inizio. Toccando un giorno si apre quel
// giorno, nella vista colonne o lista che il telefono ricorda (D2-1).
//
// Si entra e si esce dal selettore dell'operatrice nell'intestazione, non da
// una testata di colonna, che nella lista non esiste (spec §9.3).
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { giornoSettimana } from '../dominio/tempo'
import { oraDaCella } from '../dominio/tempo'
import type { Settimana } from '../dominio/settimana'
import { settimanaAccanto } from '../dominio/settimana'
import {
  CHIAVE_OPERATRICE,
  CHIAVE_VISTA,
  decisioneSettimana,
  leggiPreferenza,
  scriviPreferenza,
  vistaRicordata,
} from './preferenze'
import stile from './settimana.module.css'

const INIZIALI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']

// Le sole due forme d'indirizzo dell'agenda: la data, e l'operatrice della
// settimana, che è un `operator.id` e non un dato di una cliente (§4.8).
const giornoIndirizzo = (data: string) => `/agenda?giorno=${data}`
const settimanaIndirizzo = (data: string, operatriceId: string) => `/agenda?giorno=${data}&settimana=${operatriceId}`

export function VistaSettimana({ settimana, oggi }: { settimana: Settimana; oggi: string }) {
  const { lunedi, operatriceId } = settimana
  return (
    <div className={stile.settimana}>
      <nav aria-label="Settimane" className={stile.navigazione}>
        <Link href={settimanaIndirizzo(settimanaAccanto(lunedi, -1), operatriceId)} className={stile.salto} aria-label="Settimana prima">
          ‹
        </Link>
        <span className={stile.intervallo}>{intervallo(settimana)}</span>
        <Link href={settimanaIndirizzo(settimanaAccanto(lunedi, 1), operatriceId)} className={stile.salto} aria-label="Settimana dopo">
          ›
        </Link>
      </nav>
      <ol className={stile.giorni}>
        {settimana.giorni.map((g) => {
          const n = giornoSettimana(g.data)
          const ore = g.inizi.map(oraDaCella)
          return (
            <li key={g.data} className={stile.colonna}>
              <Link
                href={giornoIndirizzo(g.data)}
                // Si esce dalla settimana: il telefono la dimentica, o la
                // riaprirebbe al prossimo caricamento (`SCRIPT_PREFERENZE`).
                onClick={() => scriviPreferenza(CHIAVE_OPERATRICE, null)}
                aria-current={g.data === oggi ? 'date' : undefined}
                aria-label={`${GIORNI[n]} ${Number(g.data.slice(8))}: ${ore.length === 0 ? 'nessun appuntamento' : ore.join(', ')}`}
                className={[stile.giorno, g.data === oggi ? stile.oggi : ''].join(' ')}
              >
                <span className={stile.testa} aria-hidden="true">
                  <span className={stile.iniziale}>{INIZIALI[n]}</span>
                  <span className={stile.numero}>{Number(g.data.slice(8))}</span>
                </span>
                <span className={stile.ore} aria-hidden="true">
                  {ore.map((o, i) => (
                    <span key={`${o}${i}`} className={stile.inizio}>
                      {o}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

/** «9–15 marzo», «28 settembre – 4 ottobre». */
function intervallo(s: Settimana): string {
  const primo = s.giorni[0].data
  const ultimo = s.giorni[6].data
  const [m1, m2] = [Number(primo.slice(5, 7)), Number(ultimo.slice(5, 7))]
  const [g1, g2] = [Number(primo.slice(8)), Number(ultimo.slice(8))]
  return m1 === m2 ? `${g1}–${g2} ${MESI[m2 - 1]}` : `${g1} ${MESI[m1 - 1]} – ${g2} ${MESI[m2 - 1]}`
}

/**
 * L'interruttore colonne/lista (spec §9.2), ricordato per dispositivo (D2-1).
 * Non naviga: il server disegna già tutte e due le viste del giorno, e
 * l'attributo `data-vista` sull'`html` sceglie quale si vede. Il bottone
 * premuto si segna dal CSS sullo stesso attributo, quindi anche prima che
 * React si idrati.
 */
export function InterruttoreVista() {
  const [lista, setLista] = useState(false)
  // Al montaggio si riapplica la preferenza: dopo l'accesso o la barra in
  // basso lo script non ha girato, e senza questo la lista ricordata spariva.
  useEffect(() => {
    applica(vistaRicordata(leggiPreferenza(CHIAVE_VISTA)))
  }, [])
  const applica = (vista: 'colonne' | 'lista') => {
    if (vista === 'lista') document.documentElement.setAttribute('data-vista', 'lista')
    else document.documentElement.removeAttribute('data-vista')
    setLista(vista === 'lista')
  }
  const scegli = (vista: 'colonne' | 'lista') => {
    applica(vista)
    scriviPreferenza(CHIAVE_VISTA, vista)
  }
  return (
    <div role="group" aria-label="Vista" className={stile.interruttore}>
      <button type="button" aria-pressed={!lista} className={`${stile.opzione} ${stile.colonne}`} onClick={() => scegli('colonne')}>
        Colonne
      </button>
      <button type="button" aria-pressed={lista} className={`${stile.opzione} ${stile.lista}`} onClick={() => scegli('lista')}>
        Lista
      </button>
    </div>
  )
}

// L'indirizzo su cui è arrivato l'ultimo «indietro» o «avanti» del browser:
// `popstate` arriva prima che Next disegni la rotta, e il selettore lo
// consuma al montaggio. Vale solo se il selettore si monta su QUELL'indirizzo:
// un «indietro» finito su /clienti non deve contare quando poi si tocca
// «Agenda» nella barra. Si ascolta una volta, al caricamento del modulo.
let indietroSu: string | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    indietroSu = window.location.href
  })
}

/**
 * Il selettore dell'operatrice (spec §9.3): «Tutte» è il giorno, un nome è la
 * sua settimana. Solo le attive (D2-2).
 *
 * Al montaggio esegue `decisioneSettimana`: per chi arriva all'agenda
 * navigando dal client fa ciò che `SCRIPT_PREFERENZE` fa al caricamento, e
 * chi torna indietro dalla settimana al giorno resta sul giorno.
 */
export function SelettoreOperatrice({
  data,
  settimana,
  operatrici,
}: {
  data: string
  settimana: string | null
  operatrici: readonly { id: string; nome: string }[]
}) {
  const router = useRouter()
  useEffect(() => {
    const daIndietro = indietroSu === window.location.href
    indietroSu = null
    const ricordata = leggiPreferenza(CHIAVE_OPERATRICE)
    switch (decisioneSettimana({ settimana, ricordata, attive: operatrici.map((o) => o.id), daIndietro })) {
      case 'ricorda':
        scriviPreferenza(CHIAVE_OPERATRICE, settimana)
        break
      case 'riapri':
        router.replace(settimanaIndirizzo(data, ricordata!))
        break
      case 'dimentica':
        scriviPreferenza(CHIAVE_OPERATRICE, null)
        break
    }
  }, [data, settimana, operatrici, router])

  return (
    <label className={stile.selettore}>
      <span className={stile.etichetta}>Settimana di</span>
      <select
        value={settimana ?? ''}
        className={stile.scelta}
        onChange={(e) => {
          const id = e.target.value
          scriviPreferenza(CHIAVE_OPERATRICE, id === '' ? null : id)
          router.push(id === '' ? giornoIndirizzo(data) : settimanaIndirizzo(data, id))
        }}
      >
        <option value="">Tutte · giorno</option>
        {operatrici.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
    </label>
  )
}
