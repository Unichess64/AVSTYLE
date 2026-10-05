// src/app/(salone)/layout.tsx
import { redirect } from 'next/navigation'
import { Navigazione } from '../../cliente/navigazione'
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
        <form action={esci}>
          <button type="submit" className={stile.esci}>
            Esci
          </button>
        </form>
      </header>
      {/* Qui il Task 9 mette la striscia degli invii pendenti (D2-4). */}
      <main className={stile.contenuto}>{children}</main>
      <Navigazione />
    </div>
  )
}
