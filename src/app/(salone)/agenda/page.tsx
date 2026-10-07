// src/app/(salone)/agenda/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AgendaColonne, colonneScorrono } from '../../../cliente/agenda-colonne'
import { AgendaLista } from '../../../cliente/agenda-lista'
import stileAgenda from '../../../cliente/agenda.module.css'
import { SchedaDellAgenda } from '../../../cliente/apri-scheda'
import { Diretta } from '../../../cliente/diretta'
import { SCRIPT_PREFERENZE } from '../../../cliente/preferenze'
import { InterruttoreVista, SelettoreOperatrice, VistaSettimana } from '../../../cliente/settimana'
import { ScorrimentoGiorno, StrisciaGiorni, TornaAOggi } from '../../../cliente/striscia-giorni'
import { Trascina } from '../../../cliente/trascina'
import { confineDellOraAPerugia, oggiAPerugia } from '../../../dominio/perugia'
import { giorniDellaSettimana, lunediDi, operatriceDallIndirizzo } from '../../../dominio/settimana'
import { oraDaConfine, pezziData } from '../../../dominio/tempo'
import { dataDallIndirizzo } from '../../../dominio/validazione'
import { annullaSpostamento, elimina, salva, sposta, togli } from '../../../server/azioni-visita'
import { leggiGiorno } from '../../../server/lettura-giorno'
import { leggiOperatriciAttive, leggiSettimana } from '../../../server/lettura-settimana'
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
  const parametri = await searchParams
  const data = dataDallIndirizzo(giornoDallIndirizzo(parametri.giorno), oggi)
  // L'indirizzo porta il giorno mostrato: a mezzanotte, se era oggi, la
  // diretta va al giorno nuovo (Task 11, `cambioDiGiorno`).
  const esplicito = giornoDallIndirizzo(parametri.giorno) === data
  const attive = await leggiOperatriciAttive(client)
  // `?settimana=` è un `operator.id` e si valida contro le attive: storto,
  // ripetuto o di una disattivata vale come assente, e si mostra il giorno.
  const settimanaDi = operatriceDallIndirizzo(parametri.settimana, attive.map((o) => o.id))
  const nonce = (await headers()).get('x-nonce') ?? undefined

  // D2-1: la vista ricordata la sceglie lo script, prima della prima pittura.
  const preferenze = <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SCRIPT_PREFERENZE }} />
  const selettore = <SelettoreOperatrice data={data} settimana={settimanaDi} operatrici={attive} />

  if (settimanaDi !== null) {
    const settimana = await leggiSettimana(client, settimanaDi, lunediDi(data))
    const nome = attive.find((o) => o.id === settimanaDi)!.nome
    return (
      <section className={stile.pagina}>
        {preferenze}
        <header className={stile.testata}>
          <h1 className={stile.titolo}>Agenda</h1>
          <p className={stile.data}>Settimana di {nome}</p>
        </header>
        <div className={stile.comandi}>{selettore}</div>
        {/* In diretta anche la settimana: un annuncio che nomina uno dei sette giorni la rilegge. */}
        <Diretta giorno={null} giorni={giorniDellaSettimana(lunediDi(data))} oggi={oggi} esplicito={esplicito}>
          <VistaSettimana settimana={settimana} oggi={oggi} />
        </Diretta>
      </section>
    )
  }

  const giorno = await leggiGiorno(client, data, io.operatorId)
  const vuoto = giorno.appuntamenti.length === 0

  return (
    <section className={stile.pagina}>
      {preferenze}
      <header className={stile.testata}>
        <h1 className={stile.titolo}>Agenda</h1>
        <p className={stile.data}>{dataEstesa(data)}</p>
        <TornaAOggi data={data} oggi={oggi} />
      </header>
      <div className={stile.comandi}>
        <InterruttoreVista />
        {selettore}
      </div>
      <StrisciaGiorni data={data} oggi={oggi} />
      {giorno.chiusure.map((c) => (
        <p key={`${c.da}${c.motivo}`} className={stileAgenda.chiusura} role="note">
          {c.da === null || c.a === null
            ? `Salone chiuso: ${c.motivo}`
            : `Salone chiuso dalle ${oraDaConfine(c.da)} alle ${oraDaConfine(c.a)}: ${c.motivo}`}
        </p>
      ))}
      {vuoto && <p className={stile.vuoto}>Nessun appuntamento in questo giorno.</p>}
      {/* La diretta (Task 11): gli annunci del giorno e i quattro ripieghi
          rileggono la pagina; scheda e trascinamento passano di qui per
          rileggere, e le ricariche aspettano la fine di un gesto o di un invio. */}
      <Diretta giorno={data} giorni={[data]} oggi={oggi} esplicito={esplicito}>
        {/* Tutte e due le viste del giorno, e il CSS ne mostra una (D2-1): cambiare
            vista non rilegge niente e non lampeggia. Un tocco su un blocco, una
            riga o uno spazio libero apre la scheda (Task 7). */}
        <SchedaDellAgenda
          data={data}
          azioni={{ salva, togli, elimina }}
          io={io.operatorId}
          occupati={giorno.appuntamenti.map((x) => ({ operatriceId: x.operatriceId, inizio: x.inizio, durata: x.durata }))}
        >
          <div className={stile.soloColonne}>
            <ScorrimentoGiorno data={data} attivo={!colonneScorrono(giorno.operatrici)}>
              {/* Il trascinamento (Task 10): solo nelle colonne, e solo identificativi e celle. */}
              <Trascina
                data={data}
                finestra={giorno.finestra}
                azioni={{ sposta, annulla: annullaSpostamento }}
                io={io.operatorId}
                appuntamenti={giorno.appuntamenti.map((x) => ({
                  id: x.id,
                  visitaId: x.visitaId,
                  clienteId: x.clienteId,
                  operatriceId: x.operatriceId,
                  servizioId: x.servizioId,
                  inizio: x.inizio,
                  durata: x.durata,
                  pausa: x.pausa,
                }))}
              >
                <AgendaColonne
                  giorno={giorno}
                  oggi={oggi}
                  lineaDellOra={data === oggi ? Math.floor(confineDellOraAPerugia(adesso)) : null}
                />
              </Trascina>
            </ScorrimentoGiorno>
          </div>
          <div className={stile.soloLista}>
            {/* Nella lista le colonne non scorrono di lato: il giorno si cambia sempre scorrendo. */}
            <ScorrimentoGiorno data={data} attivo>
              <AgendaLista appuntamenti={giorno.appuntamenti} operatrici={giorno.operatrici} />
            </ScorrimentoGiorno>
          </div>
        </SchedaDellAgenda>
      </Diretta>
    </section>
  )
}
