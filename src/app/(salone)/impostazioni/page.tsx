// src/app/(salone)/impostazioni/page.tsx — orario del salone, categorie, servizi e chi li esegue.
import { redirect } from 'next/navigation'
import { Catalogo } from '../../../cliente/catalogo'
import stile from '../../../cliente/catalogo.module.css'
import {
  aggiungiCategoria,
  attivaServizio,
  cancellaCategoria,
  impostaEsecuzione,
  salvaOrarioSalone,
  salvaServizio,
} from '../../../server/azioni-impostazioni'
import { leggiImpostazioni } from '../../../server/lettura-impostazioni'
import { leggiOperatriciAttive } from '../../../server/lettura-settimana'
import { NonAutenticata, NonOperatrice, type Operatrice, clientServer, operatriceCorrente } from '../../../server/supabase'

export default async function Impostazioni() {
  const client = await clientServer()
  let io: Operatrice | null = null
  try {
    io = await operatriceCorrente(client)
  } catch (e) {
    if (!(e instanceof NonAutenticata || e instanceof NonOperatrice)) throw e
  }
  if (io === null) redirect('/accesso')

  const [dati, operatrici] = await Promise.all([leggiImpostazioni(client), leggiOperatriciAttive(client)])

  return (
    <section className={stile.pagina}>
      <h1 className={stile.titolo}>Impostazioni</h1>
      <Catalogo
        dati={dati}
        operatrici={operatrici.map((o) => ({ id: o.id, nome: o.nome }))}
        azioni={{ salvaOrarioSalone, aggiungiCategoria, cancellaCategoria, salvaServizio, attivaServizio, impostaEsecuzione }}
      />
    </section>
  )
}
