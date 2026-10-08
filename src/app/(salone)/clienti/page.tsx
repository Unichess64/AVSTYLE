// src/app/(salone)/clienti/page.tsx — cercare una cliente, vederne gli appuntamenti, correggerne nome e telefono.
import { redirect } from 'next/navigation'
import { Clienti } from '../../../cliente/clienti'
import stile from '../../../cliente/catalogo.module.css'
import { oggiAPerugia } from '../../../dominio/perugia'
import { aggiornaCliente } from '../../../server/azioni-clienti'
import { NonAutenticata, NonOperatrice, type Operatrice, clientServer, operatriceCorrente } from '../../../server/supabase'

export default async function PaginaClienti() {
  const client = await clientServer()
  let io: Operatrice | null = null
  try {
    io = await operatriceCorrente(client)
  } catch (e) {
    if (!(e instanceof NonAutenticata || e instanceof NonOperatrice)) throw e
  }
  if (io === null) redirect('/accesso')
  return (
    <section className={stile.pagina}>
      <h1 className={stile.titolo}>Clienti</h1>
      <Clienti oggi={oggiAPerugia()} aggiorna={aggiornaCliente} />
    </section>
  )
}
