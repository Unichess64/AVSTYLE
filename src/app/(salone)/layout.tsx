// src/app/(salone)/layout.tsx
import { redirect } from 'next/navigation'
import { Navigazione } from '../../cliente/navigazione'
import { PulsanteEsci, StrisciaInvii } from '../../cliente/striscia-invii'
import {
  NonAutenticata,
  NonOperatrice,
  type Operatrice,
  clientServer,
  operatriceCorrente,
} from '../../server/supabase'
import { esci } from './azioni'
import stile from './guscio.module.css'

export default async function Guscio({ children }: { children: React.ReactNode }) {
  let operatrice: Operatrice | null = null
  try {
    operatrice = await operatriceCorrente(await clientServer())
  } catch (e) {
    // Un guasto non è «fuori»: si rilancia, e Next mostra la pagina d'errore.
    if (!(e instanceof NonAutenticata || e instanceof NonOperatrice)) throw e
  }
  // Fuori dal try: `redirect` lancia, e il catch lo inghiottirebbe.
  if (operatrice === null) redirect('/accesso')

  return (
    <div className={stile.guscio}>
      <header className={stile.testata}>
        <img src="/AV-style-logo.png" alt="" width={40} height={37} className={stile.logo} />
        <span className={stile.titolo}>AVStyle</span>
        <span className={stile.chi}>{operatrice.nome}</span>
        {/* §4.4 punto 4: «Esci» controlla gli invii pendenti prima di chiudere la sessione. */}
        <PulsanteEsci io={operatrice.operatorId} esci={esci} classe={stile.esci} />
      </header>
      {/* D2-4: gli invii pendenti trovati alla riapertura, bene in vista e toccabili. */}
      <StrisciaInvii io={operatrice.operatorId} />
      <main className={stile.contenuto}>{children}</main>
      <Navigazione />
    </div>
  )
}
