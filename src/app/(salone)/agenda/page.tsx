// src/app/(salone)/agenda/page.tsx
import { redirect } from 'next/navigation'
import { AgendaColonne, colonneScorrono } from '../../../cliente/agenda-colonne'
import stileAgenda from '../../../cliente/agenda.module.css'
import { ScorrimentoGiorno, StrisciaGiorni, TornaAOggi } from '../../../cliente/striscia-giorni'
import { confineDellOraAPerugia, oggiAPerugia } from '../../../dominio/perugia'
import { oraDaConfine, pezziData } from '../../../dominio/tempo'
import { dataDallIndirizzo } from '../../../dominio/validazione'
import { leggiGiorno } from '../../../server/lettura-giorno'
import {
  NonAutenticata,
  NonOperatrice,
  type Operatrice,
  clientServer,
  operatriceCorrente,
} from '../../../server/supabase'
import stile from './agenda.module.css'

const DATA_ESTESA = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** La data per esteso. Costruita in UTC e letta in UTC: nessun fuso la sposta. */
function dataEstesa(data: string): string {
  const [anno, mese, giorno] = pezziData(data)
  return DATA_ESTESA.format(new Date(Date.UTC(anno, mese - 1, giorno)))
}

/**
 * `?giorno=a&giorno=b` arriva da Next come `string[]`: un elenco è un
 * indirizzo storto, e un indirizzo storto ripiega su oggi come ogni altro
 * (`dataDallIndirizzo`). Scelta dichiarata: non si prende il primo, che
 * mostrerebbe un giorno scelto a caso fra due.
 */
function giornoDallIndirizzo(grezzo: string | string[] | undefined): string | null {
  return typeof grezzo === 'string' ? grezzo : null
}

export default async function Agenda({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const client = await clientServer()
  // Il guscio fa lo stesso controllo, ma pagina e guscio si disegnano in
  // parallelo: la pagina non può contare sul redirect dell'altro.
  let io: Operatrice | null = null
  try {
    io = await operatriceCorrente(client)
  } catch (e) {
    if (!(e instanceof NonAutenticata || e instanceof NonOperatrice)) throw e
  }
  if (io === null) redirect('/accesso')

  const adesso = new Date()
  const oggi = oggiAPerugia(adesso)
  const data = dataDallIndirizzo(giornoDallIndirizzo((await searchParams).giorno), oggi)
  const giorno = await leggiGiorno(client, data, io.operatorId)
  const vuoto = giorno.appuntamenti.length === 0

  return (
    <section className={stile.pagina}>
      <header className={stile.testata}>
        <h1 className={stile.titolo}>Agenda</h1>
        <p className={stile.data}>{dataEstesa(data)}</p>
        <TornaAOggi data={data} oggi={oggi} />
      </header>
      <StrisciaGiorni data={data} oggi={oggi} />
      {giorno.chiusure.map((c) => (
        <p key={`${c.da}${c.motivo}`} className={stileAgenda.chiusura} role="note">
          {c.da === null || c.a === null
            ? `Salone chiuso: ${c.motivo}`
            : `Salone chiuso dalle ${oraDaConfine(c.da)} alle ${oraDaConfine(c.a)}: ${c.motivo}`}
        </p>
      ))}
      {vuoto && <p className={stile.vuoto}>Nessun appuntamento in questo giorno.</p>}
      <ScorrimentoGiorno data={data} attivo={!colonneScorrono(giorno.operatrici)}>
        <AgendaColonne
          giorno={giorno}
          oggi={oggi}
          lineaDellOra={data === oggi ? Math.floor(confineDellOraAPerugia(adesso)) : null}
        />
      </ScorrimentoGiorno>
    </section>
  )
}
