// src/app/(salone)/impostazioni/operatrici/page.tsx — le operatrici e i loro account.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Operatrici } from '../../../../cliente/operatrici'
import stile from '../../../../cliente/catalogo.module.css'
import { aggiungiOperatrice, attiva, cambiaColore, chiudiSessioni, collega, scollega, sposta } from '../../../../server/azioni-operatrici'
import { leggiOperatrici } from '../../../../server/lettura-operatrici'
import { NonAutenticata, NonOperatrice, type Operatrice, clientServer, operatriceCorrente } from '../../../../server/supabase'

export default async function PaginaOperatrici() {
  const client = await clientServer()
  let io: Operatrice | null = null
  try {
    io = await operatriceCorrente(client)
  } catch (e) {
    if (!(e instanceof NonAutenticata || e instanceof NonOperatrice)) throw e
  }
  if (io === null) redirect('/accesso')
  const { operatrici, liberi } = await leggiOperatrici(client, io.operatorId)

  return (
    <section className={stile.pagina}>
      <Link href="/impostazioni" className={stile.indietro}>← Impostazioni</Link>
      <h1 className={stile.titolo}>Operatrici</h1>
      <Operatrici
        operatrici={operatrici}
        liberi={liberi}
        azioni={{ aggiungiOperatrice, attiva, cambiaColore, chiudiSessioni, collega, scollega, sposta }}
      />
    </section>
  )
}
