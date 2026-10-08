// src/app/(salone)/disponibilita/page.tsx — la settimana tipo di ciascuna operatrice.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Assenze } from '../../../cliente/periodi'
import { SettimanaTipo } from '../../../cliente/settimana-tipo'
import stile from '../../../cliente/settimana-tipo.module.css'
import { operatriceDallIndirizzo } from '../../../dominio/settimana'
import { oggiAPerugia } from '../../../dominio/perugia'
import { salvaGiornoSettimana } from '../../../server/azioni-disponibilita'
import { anteprimaAssenza, cancellaAssenza, salvaAssenza } from '../../../server/azioni-periodi'
import { leggiAssenze } from '../../../server/lettura-periodi'
import { leggiSettimanaTipo } from '../../../server/lettura-disponibilita'
import { leggiOperatriciAttive } from '../../../server/lettura-settimana'
import { NonAutenticata, NonOperatrice, type Operatrice, clientServer, operatriceCorrente } from '../../../server/supabase'

export default async function Disponibilita({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const client = await clientServer()
  let io: Operatrice | null = null
  try {
    io = await operatriceCorrente(client)
  } catch (e) {
    if (!(e instanceof NonAutenticata || e instanceof NonOperatrice)) throw e
  }
  if (io === null) redirect('/accesso')

  const attive = await leggiOperatriciAttive(client)
  const parametri = await searchParams
  const ids = attive.map((o) => o.id)
  const scelta =
    operatriceDallIndirizzo(parametri.operatrice, ids) ?? (ids.includes(io.operatorId) ? io.operatorId : ids[0] ?? null)

  return (
    <section className={stile.pagina}>
      <h1 className={stile.titolo}>Disponibilità</h1>
      <nav className={stile.operatrici} aria-label="Operatrice">
        {attive.map((o) => (
          <Link
            key={o.id}
            href={`/disponibilita?operatrice=${o.id}`}
            className={stile.operatrice}
            aria-current={o.id === scelta ? 'page' : undefined}
          >
            {o.nome}
          </Link>
        ))}
      </nav>
      {scelta === null ? (
        <p className={stile.vuoto}>Nessuna operatrice attiva.</p>
      ) : (
        <>
          <h2 className={stile.sottotitolo}>Settimana tipo</h2>
          <SettimanaTipo
            key={scelta}
            operatriceId={scelta}
            iniziale={await leggiSettimanaTipo(client, scelta)}
            salva={salvaGiornoSettimana}
          />
          <div className={stile.assenze}>
            <Assenze
              key={`assenze-${scelta}`}
              operatriceId={scelta}
              nome={attive.find((o) => o.id === scelta)?.nome ?? ''}
              oggi={oggiAPerugia()}
              assenze={await leggiAssenze(client, scelta, oggiAPerugia())}
              azioni={{ anteprima: anteprimaAssenza, salva: salvaAssenza, cancella: cancellaAssenza }}
            />
          </div>
        </>
      )}
    </section>
  )
}
